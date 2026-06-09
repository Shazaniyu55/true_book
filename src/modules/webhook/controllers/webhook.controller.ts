import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  RawBodyRequest,
  Req
} from '@nestjs/common';
import { Request } from 'express';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Public } from '@shared/decorators/isPublic.decorator';
import { SkipKillSwitch } from '@modules/kill-switch/kill-switch.guard';
import { ServiceName } from '@shared/decorators/servicename.decorators';
import { PaystackAdapter } from '@adapters/payment/paystack/paystack.adapter';
import { Booking } from '@modules/core/entities/booking.entity';
import { Escrow } from '@modules/core/entities/escro.entity';
import { DocumentVerification } from '@modules/core/entities/document-verification.entity';
import { Notification } from '@modules/core/entities/notification.entity';
import { Driver } from '@modules/core/entities/driver.entity';
import {  DocumentStatus, EscrowStatus, KycStatus, PaymentStatus } from '../../../types/enums';
import { TripsService } from '@modules/trip/service/trip.service';
import { ExpoService } from '@modules/notification/services/expo.service';
import { SkipThrottle } from '@nestjs/throttler';
import { PaymentService } from '@modules/passenger/services/payment.service';
import { PayoutService } from '@modules/driver/services/payout.service';

@ApiTags('Webhooks')
@ServiceName('webhooks')
@SkipThrottle()
@Controller('webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    private readonly paystackAdapter: PaystackAdapter,
    private readonly tripsService: TripsService,
    @InjectRepository(Booking) private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(Escrow) private readonly escrowRepo: Repository<Escrow>,
    @InjectRepository(DocumentVerification) private readonly docRepo: Repository<DocumentVerification>,
    @InjectRepository(Notification) private readonly notifRepo: Repository<Notification>,
    @InjectRepository(Driver) private readonly driverRepo: Repository<Driver>,
    private readonly expoService: ExpoService,
      private readonly paymentService: PaymentService,   
     private readonly payoutService: PayoutService, 
  ) {}

  // ─── Paystack ─────────────────────────────────────────────────────────────

  @Public()
@SkipKillSwitch()
@Post('paystack')
@HttpCode(HttpStatus.OK)
async handlePaystack(
  @Headers('x-paystack-signature') signature: string,
  @Req() req: RawBodyRequest<Request>,
) {
  const raw = req.rawBody?.toString('utf8');
  if (!raw || !this.paystackAdapter.verifyWebhookSignature(raw, signature)) {
    this.logger.warn('Paystack webhook: invalid signature — ignored');
    return { received: false };
  }

  const { event, data } = JSON.parse(raw);
  const reference = data?.reference;
  this.logger.log(`Paystack event: ${event} | ref: ${reference}`);
  if (!reference) return { received: true };

  switch (event) {
    case 'charge.success':
      await this.paymentService.verifyPayment(
        reference,
        data.channel ?? 'unknown',
        data.created_at,
        data.authorization ? [data.authorization] : [],
      );
      break;
    case 'transfer.success':
    case 'paymentrequest.success':
      await this.payoutService.completePayout(reference);
      break;
    case 'transfer.failed':
    case 'transfer.reversed':
      await this.payoutService.reversePayout(reference);
      break;
    case 'refund.processed':
      await this.handleRefundProcessed(data);
      break;
    default:
      this.logger.log(`Unhandled Paystack event: ${event}`);
  }
  return { received: true };
}
  // @Public()
  // @SkipKillSwitch()
  // @Post('paystack')
  // @HttpCode(HttpStatus.OK)
  // @ApiOperation({
  //   summary: 'Paystack webhook — charge.success, transfer.success/failed',
  //   description: 'Do NOT call manually. Paystack sends events here.',
  // })
  // async handlePaystack(
  //   @Headers('x-paystack-signature') signature: string,
  //   @Req() req: RawBodyRequest<Request>,
  //   @Body() rawBody: any,
  // ) {
  //   // 1. Verify signature
  //      const raw = req.rawBody?.toString('utf8');
  //   if (!raw || !this.paystackAdapter.verifyWebhookSignature(raw, signature)) {
  //     this.logger.warn('Paystack webhook: invalid signature — ignored');
  //     return { received: false };
  //   }

   

  //   const { event, data } = rawBody;
  //   this.logger.log(`Paystack event: ${event} | ref: ${data?.reference}`);

  //   switch (event) {
  //     case 'charge.success':
  //       await this.handleChargeSuccess(data);
  //       break;
  //     case 'transfer.success':
  //       await this.handleTransferSuccess(data);
  //       break;
  //     case 'transfer.failed':
  //     case 'transfer.reversed':
  //       await this.handleTransferFailed(data, event);
  //       break;
  //     case 'refund.processed':
  //       await this.handleRefundProcessed(data);
  //       break;
  //     default:
  //       this.logger.log(`Unhandled Paystack event: ${event}`);
  //   }

  //   return { received: true };
  // }

  // ─── Dojah KYC ────────────────────────────────────────────────────────────

  @Public()
  @SkipKillSwitch()
  @Post('dojah')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Dojah KYC webhook — verification results' })
  async handleDojah(@Body() body: any) {
    const { event, data } = body ?? {};
    this.logger.log(`Dojah event: ${event}`);

    switch (event) {
      case 'verification.complete':
      case 'kyc.completed':
        await this.handleKycComplete(data);
        break;
      case 'kyc.failed':
        await this.handleKycFailed(data);
        break;
    }

    return { received: true };
  }

  // ─── Payment: charge.success ──────────────────────────────────────────────

  private async handleChargeSuccess(data: any) {
    const reference = data?.reference as string;
    if (!reference) return;

    const metadata = data?.metadata ?? {};
    const bookingId: string | undefined = metadata?.bookingId;
    const type: string | undefined = metadata?.type;

    if (!bookingId || type !== 'trip_booking') {
      this.logger.log(`charge.success ref ${reference} — not a trip booking, skipped`);
      return;
    }

      //  Re-verify with Paystack directly (never trust webhook payload alone)
      let verified;
  try {
    verified = await this.paystackAdapter.verifyPayment(reference);
  } catch (err) {
    this.logger.error(`Verify failed for ref ${reference}`, err?.message);
    return;
  }
  if (!verified.status) {
    this.logger.warn(`charge.success ref ${reference} — verification not successful, skipped`);
    return;
  }

  // Assert the amount matches what we expect for this booking
  const booking = await this.bookingRepo.findOne({ where: { id: bookingId } });
  if (!booking) {
    this.logger.warn(`charge.success ref ${reference} — booking ${bookingId} not found`);
    return;
  }
  if (Number(verified.amount) < Number(booking.amountPaid)) {
    this.logger.error(
      `Amount mismatch ref ${reference}: paid ${verified.amount} < expected ${booking.amountPaid}`,
    );
    return;
  }

    try {
      await this.tripsService.confirmBookingPayment(bookingId, reference);
      this.logger.log(`Booking ${bookingId} confirmed via escrow — ref ${reference}`);
    } catch (err) {
      this.logger.error(`Failed to confirm booking ${bookingId}`, err?.message);
    }
  }

  // ─── Transfer: success (payout released) ─────────────────────────────────

  private async handleTransferSuccess(data: any) {
    const transferCode = data?.transfer_code as string;
    if (!transferCode) return;

    const escrow = await this.escrowRepo.findOne({
      where: { metadata: { transferCode } as any },
    });
    if (!escrow) {
      this.logger.log(`transfer.success — no escrow found for transfer ${transferCode}`);
      return;
    }

    if (escrow.status !== EscrowStatus.RELEASED) {
      escrow.status = EscrowStatus.RELEASED;
      escrow.releasedAt = new Date();
      await this.escrowRepo.save(escrow);
    }

   

  
  }

  // ─── Transfer: failed / reversed ──────────────────────────────────────────

  private async handleTransferFailed(data: any, event: string) {
    const transferCode = data?.transfer_code as string;
    this.logger.warn(`Transfer ${event}: code=${transferCode}`);

    const escrow = await this.escrowRepo.findOne({
      where: { metadata: { transferCode } as any },
    });
    if (!escrow) return;

    // Revert driver wallet deduction
    await this.driverRepo.increment(
      { id: escrow.driverId },
      'walletBalance',
      Number(escrow.netDriverAmount),
    );

  }

  // ─── Refund processed ─────────────────────────────────────────────────────

  private async handleRefundProcessed(data: any) {
    const reference = data?.transaction_reference as string;
    if (!reference) return;

    const booking = await this.bookingRepo.findOne({
      where: { paymentReference: reference },
    });
    if (!booking) return;

    booking.paymentStatus = PaymentStatus.REFUNDED;
    await this.bookingRepo.save(booking);
    this.logger.log(`Refund processed for booking ref ${reference}`);
  }

  // ─── Dojah KYC complete ───────────────────────────────────────────────────

  private async handleKycComplete(data: any) {
    const driverId: string | undefined = data?.driverId ?? data?.metadata?.driverId;
    const documentType: string | undefined = data?.documentType ?? data?.type;

    if (!driverId) return;

    // Mark document as approved
    if (documentType) {
      const doc = await this.docRepo.findOne({
        where: { driverId, documentType },
      });
      if (doc) {
        doc.status = DocumentStatus.APPROVED;
        doc.verificationData = data;
        await this.docRepo.save(doc);
      }
    }

    // Check if all driver documents are now approved
    const allDocs = await this.docRepo.find({ where: { driverId } });
    if (allDocs.length && allDocs.every((d) => d.status === DocumentStatus.APPROVED)) {
      await this.driverRepo.update(driverId, { kycComplete: KycStatus.COMPLETED });
    }


  }

  // ─── Dojah KYC failed ─────────────────────────────────────────────────────

  private async handleKycFailed(data: any) {
    const driverId: string | undefined = data?.driverId ?? data?.metadata?.driverId;
    const documentType: string | undefined = data?.documentType ?? data?.type;
    const reason: string = data?.reason ?? 'Verification could not be completed';

    if (!driverId) return;

    if (documentType) {
      const doc = await this.docRepo.findOne({ where: { driverId, documentType } });
      if (doc) {
        doc.status = DocumentStatus.REJECTED;
        doc.rejectionReason = reason;
        await this.docRepo.save(doc);
      }
    }



  // ─── Helper: save in-app notification ────────────────────────────────────

  }
}