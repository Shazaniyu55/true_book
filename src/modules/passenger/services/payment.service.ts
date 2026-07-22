import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';

import { Payment } from '@modules/core/entities/payment.entity';
import { Booking } from '@modules/core/entities/booking.entity';
import { Passenger } from '@modules/core/entities/passenger.entity';

import { PaymentFactory } from '@adapters/payment/payment.factory';
import { CouponService } from '@modules/coupon-referral/service/cupon.service';
import { NotificationService } from '@modules/notification/services/notification.service';
import { RandomnessUtil } from '@shared/utils/encryption/randomness.util';

import { BookingStatus, EscrowStatus, NotificationType, PaymentStatus, TicketStatus } from 'src/types/enums';
import { InitiatePaymentDto } from '../dtos/passanger.dto';
import { RedisCacheService } from '@modules/cache/redis-cache.service';
import { CACHE_KEYS, CACHE_TTL } from '@modules/cache/redis-cache.constants';
import { BookingIntent, BookingIntentStatus } from '@modules/core/entities/booking_intent.entity';
import { Escrow } from '@modules/core/entities/escro.entity';
import { Coupon } from '@modules/core/entities/coupon.entity';
const PLATFORM_FEE_RATE = 10;

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    @InjectRepository(Payment) private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(Booking) private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(Passenger) private readonly passengerRepo: Repository<Passenger>,
    private readonly dataSource: DataSource,
    private readonly paymentFactory: PaymentFactory,
    private readonly couponService: CouponService,
    private readonly notificationService: NotificationService,
    private readonly randomness: RandomnessUtil,
     private readonly cache: RedisCacheService,
  ) {}

  // ─── Initiate payment ─────────────────────────────────────────────────────
  async initiatePayment(userId: string, dto: InitiatePaymentDto) {
    const passenger = await this.passengerRepo.findOne({
      where: { userId },
      relations: ['user'],
    });
    if (!passenger) throw new NotFoundException('Passenger profile not found');

    const booking = await this.bookingRepo.findOne({
      where: { id: dto.bookTripId },
      relations: ['trip', 'passenger', 'passenger.user'],
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.passengerId !== passenger.id)
      throw new ForbiddenException('This booking does not belong to you');

    const trip = booking.trip;
    if (!trip) throw new NotFoundException('Trip not found for this booking');

    const reference = this.randomness.generateReference('TRIP');


    let amount = Number(booking.amountPaid ?? booking.totalAmount ?? 0);
    if (booking.couponCode && !Number(booking.discountAmount)) {
      const { discountAmount } = await this.couponService.applyCoupon(
        booking.couponCode,
        Number(booking.totalAmount),
      );
      if (discountAmount > 0) {
        amount = Math.max(Number(booking.totalAmount) - discountAmount, 0);
        await this.bookingRepo.update(booking.id, { discountAmount, amountPaid: amount });
      }
    }

    const payment = await this.paymentRepo.save(
      this.paymentRepo.create({
        bookingId: booking.id,
        passengerId: passenger.id,
        tripId: trip.id,
        currency: 'NGN',
        billingDetails: dto.billingDetails ?? {},
        status: PaymentStatus.PENDING,
        txRef: reference,
        amount,
        customerName: `${passenger.user.firstName} ${passenger.user.lastName}`,
        customerEmail: passenger.user.email,
      }),
    );

    const gateway = await this.paymentFactory.initiatePayment({
      amount,
      email: passenger.user.email,
      reference,
      callback_url: dto.callbackUrl,
      metadata: {
        paymentId: payment.id,
        bookingId: booking.id,
        bookingCode: booking.bookingCode,
        tripId: trip.id,
        passengerId: passenger.id,
        driverId: trip.driverId,
        type: 'trip_booking',
        billingDetails: dto.billingDetails ?? {},
      },
    });

    this.logger.log(`Payment initiated ${reference} for booking ${booking.bookingCode}`);
    return { payment, ...gateway };
  }

// ─── Verify payment ───────────────────────────────────────────────────────

// async verifyPayment(
//   reference: string,
//   channel: string,
//   paidAt?: string,
//   card: any[] = [],
//   em?: EntityManager,
// ): Promise<boolean> {
//   const run = async (manager: EntityManager): Promise<boolean> => {
//     const payment = await manager.findOne(Payment, {
//       where: { txRef: reference, status: PaymentStatus.PENDING },
//     });

//     if (!payment) {
//       this.logger.warn(`Payment not found or not pending for ref ${reference}`);
//       return false;
//     }

//     const booking = await manager.findOne(Booking, {
//       where: { id: payment.bookingId },
//       relations: ['trip', 'trip.driver', 'passenger', 'passenger.user'],
//     });

//     if (!booking) {
//       this.logger.error(`Booking ${payment.bookingId} not found for payment ${payment.id}`);
//       return false;
//     }

//     // ── GUARD: never trust the webhook payload alone. Re-verify with Paystack
//     //    directly, then assert the charge succeeded and the amount is sufficient.
//     let verified;
//     try {
//       verified = await this.paymentFactory.verifyPayment(reference);
//     } catch (err) {
//       this.logger.error(`Gateway verify failed for ref ${reference}: ${err?.message}`);
//       return false; // transient gateway error → let the webhook retry
//     }

//     if (!verified.status) {
//       this.logger.warn(`Gateway reports ref ${reference} not successful — skipped`);
//       return false;
//     }

//     // verified.amount is in NGN (Paystack provider already divides by 100);
//     // our Payment.amount is also stored in NGN.
//     if (Number(verified.amount) < Number(payment.amount)) {
//       this.logger.error(
//         `Amount mismatch ref ${reference}: paid ${verified.amount} < expected ${payment.amount}`,
//       );
//       return false;
//     }

//     // ── Past the guard: safe to confirm ──
//     await manager.update(Payment, payment.id, {
//       status: PaymentStatus.SUCCESS,
//       raveReference: reference,
//       paymentType: channel,
//       card,
//     });

//     await manager.update(Booking, booking.id, {
//       status: BookingStatus.CONFIRMED,
//       paymentStatus: PaymentStatus.SUCCESS,
//       paymentReference: reference,
//        ticketStatus: TicketStatus.ISSUED,                         
//      ticketToken: this.randomness.generateReference('TKT'),
//     });

//     // Notifications are best-effort and must never roll back the payment.
//     await this.sendPaymentNotifications(booking);

//     this.logger.log(`Payment ${reference} verified — booking ${booking.bookingCode} confirmed`);
//     return true;
//   };

//   try {
//     return em ? await run(em) : await this.dataSource.transaction(run);
//   } catch (err) {
//     this.logger.error(`Payment verification failed for ${reference}: ${err?.message}`);
//     return false;
//   }
// }

async verifyPayment(
  reference: string,
  channel: string,
  paidAt?: string,
  card: any[] = [],
  em?: EntityManager,
): Promise<boolean> {
  const run = async (manager: EntityManager): Promise<boolean> => {
    const payment = await manager.findOne(Payment, {
      where: { txRef: reference, status: PaymentStatus.PENDING },
    });
    if (!payment) {
      this.logger.warn(`Payment not found or not pending for ref ${reference}`);
      return false;
    }

    // idempotency: a previous webhook may already have created the booking
    const already = await manager.findOne(Booking, {
      where: { paymentReference: reference },
      relations: ['trip', 'trip.driver', 'passenger', 'passenger.user'],
    });
    if (already) {
      await manager.update(Payment, payment.id, {
        status: PaymentStatus.SUCCESS,
        bookingId: already.id,
      });
      return true;
    }

    // the staged booking lives on the intent, not on bookings yet
    const intent = await manager.findOne(BookingIntent, {
      where: { id: payment.bookingIntentId },
      relations: ['trip', 'trip.driver', 'passenger', 'passenger.user'],
    });
    if (!intent) {
      this.logger.error(
        `No booking intent ${payment.bookingIntentId} for payment ${payment.id}`,
      );
      return false;
    }
    if (intent.status !== BookingIntentStatus.PENDING) {
      this.logger.warn(`Intent ${intent.id} already ${intent.status} — skipping`);
      return false;
    }

    // ── GUARD: never trust the webhook alone. Re-verify with the gateway. ──
    let verified;
    try {
      verified = await this.paymentFactory.verifyPayment(reference);
    } catch (err) {
      this.logger.error(`Gateway verify failed for ref ${reference}: ${err?.message}`);
      return false; // transient → let the webhook retry
    }

    if (!verified.status) {
      this.logger.warn(`Gateway reports ref ${reference} not successful — skipped`);
      return false;
    }

    if (Number(verified.amount) < Number(payment.amount)) {
      this.logger.error(
        `Amount mismatch ref ${reference}: paid ${verified.amount} < expected ${payment.amount}`,
      );
      return false;
    }

    // ── Past the guard: create the ONLY booking row for this intent ──
    const booking = await manager.save(
      Booking,
      manager.create(Booking, {
        bookingCode: intent.bookingCode,
        tripId: intent.tripId,
        passengerId: intent.passengerId,
        seats: intent.seats,
        totalAmount: intent.totalAmount,
        discountAmount: intent.discountAmount,
        amountPaid: intent.amountPaid,
        couponCode: intent.couponCode,
        status: BookingStatus.CONFIRMED,
        paymentStatus: PaymentStatus.SUCCESS,
        paymentReference: reference,
        ticketStatus: TicketStatus.ISSUED,
        ticketToken: this.randomness.generateReference('TKT'),
        ticketIssuedAt: new Date(),
        metadata: intent.metadata,
      }),
    );

    // consume the intent so it can never be materialized twice
    await manager.update(BookingIntent, intent.id, {
      status: BookingIntentStatus.CONSUMED,
    });

    // link the payment to the real booking
    await manager.update(Payment, payment.id, {
      status: PaymentStatus.SUCCESS,
      bookingId: booking.id,
      raveReference: reference,
      paymentType: channel,
      card,
    });

    // coupon usage counts only now that money actually arrived
    if (intent.couponId) {
      await manager.increment(Coupon, { id: intent.couponId }, 'usageCount', 1);
    }

    // ── escrow: hold funds for the driver ──
    const platformFee = (Number(booking.amountPaid) * PLATFORM_FEE_RATE) / 100;
    await manager.save(
      Escrow,
      manager.create(Escrow, {
        reference: this.randomness.generateReference('ESC'),
        bookingId: booking.id,
        amount: booking.amountPaid,
        platformFee,
        netDriverAmount: Number(booking.amountPaid) - platformFee,
        status: EscrowStatus.HELD,
        driverId: intent.trip?.driverId,
        passengerId: booking.passengerId,
        paymentReference: reference,
      }),
    );

    // notifications need the relations populated — attach from the intent
    booking.trip = intent.trip;
    booking.passenger = intent.passenger;
    await this.sendPaymentNotifications(booking);

    this.logger.log(
      `Payment ${reference} verified — booking ${booking.bookingCode} created & confirmed`,
    );
    return true;
  };

  try {
    return em ? await run(em) : await this.dataSource.transaction(run);
  } catch (err) {
    this.logger.error(`Payment verification failed for ${reference}: ${err?.message}`);
    return false;
  }
}
  // ─── Notifications (passenger, driver, admins) ────────────────────────────
  async sendPaymentNotifications(booking: Booking): Promise<void> {
    const passengerUserId = booking.passenger?.userId;
    const driverUserId = booking.trip?.driver?.userId;
    const code = booking.bookingCode;

    if (passengerUserId) {
      await this.notificationService.notify({
        userId: passengerUserId,
        title: 'Payment Successful',
        body: `Your booking ${code} is confirmed. Have a safe trip!`,
        type: NotificationType.PAYMENT_SUCCESS,
        data: { bookingId: booking.id, bookingCode: code },
      });
    }

    if (driverUserId) {
      await this.notificationService.notify({
        userId: driverUserId,
        title: 'New Booking',
        body: `A passenger has paid for booking ${code} on your trip.`,
        type: NotificationType.TRIP_BOOKED,
        data: { bookingId: booking.id, bookingCode: code, tripId: booking.tripId },
      });
    }

    await this.notificationService.notifyAdmins({
      title: 'Trip Booked',
      body: `Booking ${code} paid — amount N${Number(booking.amountPaid)}.`,
      type: NotificationType.TRIP_BOOKED,
      data: { bookingId: booking.id, bookingCode: code },
    });
  }

  // ─── Bank list ────────────────────────────────────────────────────────────

async getBankList() {
  return this.cache.getOrSet(
    CACHE_KEYS.BANK_LIST,
    () => this.paymentFactory.getBankList(),
    CACHE_TTL.DAY,
  );
}
}