import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';

import { Driver } from '@modules/core/entities/driver.entity';
import { Agent } from '@modules/core/entities/agent.entity';
import { Payout } from '@modules/core/entities/payout.entity';
import { Beneficiary, BeneficiaryType } from '@modules/core/entities/beneficiary.entity';
import { Booking } from '@modules/core/entities/booking.entity';

import { PaystackAdapter } from '@adapters/payment/paystack/paystack.adapter';
import { NotificationService } from '@modules/notification/services/notification.service';
import { RandomnessUtil } from '@shared/utils/encryption/randomness.util';
import { BookingStatus, EscrowStatus, NotificationType, PaymentStatus, PayoutStatus } from 'src/types/enums';
import { InitiatePayoutDto } from '../dtos/payout.dto';
import { RedisCacheService } from '@modules/cache/redis-cache.service';
import { CACHE_KEYS, CACHE_TTL } from '@modules/cache/redis-cache.constants';
import { Escrow } from '@modules/core/entities/escro.entity';
const PLATFORM_FEE_RATE = parseFloat(process.env.PLATFORM_FEE_RATE ?? '7');
type PayoutEntity = Driver | Agent;
type EntityKind = 'driver' | 'agent';
export type TransactionShape = {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  status: string;
  narration: string;
  platform_charge: number;
  driver_earned: number;
  created_at: Date | string;
  updated_at: Date | string;
  payment_details?: {
    bank_name?: string | null;
    account_number?: string | null;
    bank_code?: string | null;
  };
};

@Injectable()
export class PayoutService {
  private readonly logger = new Logger(PayoutService.name);

  constructor(
    @InjectRepository(Driver) private readonly driverRepo: Repository<Driver>,
    @InjectRepository(Agent) private readonly agentRepo: Repository<Agent>,
    @InjectRepository(Beneficiary) private readonly beneficiaryRepo: Repository<Beneficiary>,
    private readonly dataSource: DataSource,
    private readonly paystackAdapter: PaystackAdapter,
    private readonly notificationService: NotificationService,
    private readonly randomness: RandomnessUtil,
    private readonly cache: RedisCacheService,
    
  ) {}

  // ─── Driver/Agent requests a withdrawal ───────────────────────────────────

async initiatePayout(userId: string, dto: InitiatePayoutDto) {
  return this.dataSource.transaction(async (manager) => {
    const { entity, kind } = await this.resolveEntity(userId, manager);


    if (!dto.accountNumber || !dto.bankCode) {
      throw new BadRequestException('Account number and bank code are required');
    }

    // ── Verify the account number actually belongs to a real bank account ──
    let resolved: { account_number: string; account_name: string;  };
    try {
      resolved = await this.paystackAdapter.nameEnquiry(
        dto.accountNumber,
        dto.bankCode,
      );
    } catch (err) {
      this.logger.error(`Account resolve failed for ${dto.accountNumber}: ${err?.message}`);
      throw new BadRequestException('Could not verify this account number with the bank');
    }
    if (!resolved?.account_name) {
      throw new BadRequestException('Could not verify this account number with the bank');
    }

    if (Number(entity.currentBalance) < Number(dto.amount)) {
      throw new BadRequestException('Insufficient balance');
    }

     let beneficiary: Beneficiary | null = null;
    try {
      if (!dto.bankHolderName) dto.bankHolderName = resolved.account_name;
      beneficiary = await this.createBeneficiary(entity, kind, dto, manager);
    } catch (err) {
      this.logger.warn(
        `Could not save beneficiary for user ${userId} (${dto.accountNumber}/${dto.bankCode}): ${err?.message}`,
      );
    }

    const payout = await this.createPayoutRecord(entity, kind, dto, resolved, manager);

    // Drivers (and refunds) dispense immediately; agents wait for admin approval.
    if (kind === 'driver' || dto.refund) {
      return this.dispenseFundFromPayout(payout.id, manager);
    }
    return { message: 'Payout initiated successfully', status: true };
  });
}


  // ─── Actually push money to the bank via Paystack ─────────────────────────
async dispenseFundFromPayout(payoutId: string, em?: EntityManager) {
  const run = async (manager: EntityManager) => {
    const payout = await manager.findOne(Payout, {
      where: { id: payoutId },
      relations: ['driver', 'agent', 'beneficiary'],
    });
    if (!payout) throw new NotFoundException('Payout not found');
    const details = (payout.paymentDetails ?? {}) as Record<string, any>;

    // 1. Gateway must have funds (amounts in Naira)
    const { balance } = await this.paystackAdapter.checkBalance();
    this.logger.debug(
      `Payout ${payout.reference}: gateway balance ₦${balance} vs payout amount ₦${payout.amount}`,
    );

    if (balance < Number(payout.amount)) {
      this.logger.warn(
        `Payout ${payout.reference} blocked — insufficient gateway balance (₦${balance} < ₦${payout.amount})`,
      );
      // Don't leave the payout stuck in PENDING — mark it declined so the
      // webhook can never mistakenly claim it and admins aren't left with ghosts.
      await manager.update(Payout, payout.id, { status: PayoutStatus.DECLINED });
      return {
        message: "Can't process this request right now, try again later.",
        status: false,
      };
    }

    // 2. Reuse or create a transfer recipient
    let recipientCode = payout.recipientCode ?? payout.beneficiary?.recipientCode;
    if (!recipientCode) {
      const created = await this.paystackAdapter.createTransferRecipient({
        name: details.bank_holder_name || payout.beneficiary?.bankHolderName || 'Beneficiary',
        account_number: details.account_number,
        bank_code: details.bank_code,
      });
      recipientCode = created.recipient_code;
      if (payout.beneficiaryId) {
        await manager.update(Beneficiary, payout.beneficiaryId, { recipientCode });
      }
    }

    // 3. Initiate transfer (provider converts Naira → kobo)
    let transfer: { transfer_code: string; status: string };
    try {
      transfer = await this.paystackAdapter.initiatePayout({
        recipient_code: recipientCode,
        account_number: details.account_number,
        bank_code: details.bank_code,
        amount: Number(payout.amount),
        reason: payout.narration ?? 'Payout',
      });
    } catch (err) {
      this.logger.error(`Payout transfer failed for ${payout.reference}: ${err?.message}`);
      // Same cleanup here — the transfer never happened, so decline the record.
      await manager.update(Payout, payout.id, { status: PayoutStatus.DECLINED });
      return { message: `Payment gateway error: ${err?.message}`, status: false };
    }

    // 4. Mark approved + debit wallet (debited HERE, so the transfer.success
    //    webhook will skip it — see completePayout's pending-only claim).
    await manager.update(Payout, payout.id, {
      status: PayoutStatus.APPROVED,
      transferCode: transfer.transfer_code,
      recipientCode,
      transactionDate: new Date(),
    });
    await this.adjustBalance(payout, Number(payout.amount), 'debit', manager);

    const userId = payout.driver?.userId ?? payout.agent?.userId;
    if (userId) {
      await this.notificationService.notify({
        userId,
        title: 'Withdrawal Successful',
        body: `Your withdrawal of N${payout.amount} has been processed.`,
        type: NotificationType.PAYOUT_APPROVED,
        data: { payoutId: payout.id, reference: payout.reference },
      });
    }
    return { message: transfer.status ?? 'Transfer queued', status: true };
  };
  return em ? run(em) : this.dataSource.transaction(run);
}

  // ─── Webhook: transfer.success / paymentrequest.success ───────────────────
  async completePayout(reference: string, em?: EntityManager): Promise<boolean> {
    const run = async (manager: EntityManager): Promise<boolean> => {
      const claim = await manager.update(
        Payout,
        { reference, status: PayoutStatus.PENDING },
        { status: PayoutStatus.APPROVED, transactionDate: new Date() },
      );
      if (!claim.affected) {
        this.logger.log(`completePayout: ${reference} not pending — skipped`);
        return false;
      }

      const payout = await manager.findOne(Payout, {
        where: { reference },
        relations: ['driver', 'agent'],
      });

      if (reference.toLowerCase().includes('refund-')) {
        const code = reference.replace(/refund-/i, '');
        await manager.update(
          Booking,
          { bookingCode: code },
          { status: BookingStatus.REFUNDED, paymentStatus: PaymentStatus.REFUNDED },
        );
        this.logger.log(`Refund settled for booking ${code}`);
      } else {
        await this.adjustBalance(payout, Number(payout.amount), 'debit', manager);
      }

      const userId = payout.driver?.userId ?? payout.agent?.userId;
      if (userId) {
        await this.notificationService.notify({
          userId,
          title: 'Withdrawal Successful',
          body: `Your withdrawal of N${payout.amount} has been processed.`,
          type: NotificationType.PAYOUT_APPROVED,
          data: { payoutId: payout.id, reference: payout.reference },
        });
      }
      return true;
    };
    try {
      return em ? await run(em) : await this.dataSource.transaction(run);
    } catch (err) {
      this.logger.error(`completePayout failed for ${reference}: ${err?.message}`);
      return false;
    }
  }

  // ─── Webhook: transfer.failed / transfer.reversed ─────────────────────────
  async reversePayout(reference: string): Promise<boolean> {
    return this.dataSource.transaction(async (manager) => {
      const payout = await manager.findOne(Payout, {
        where: { reference },
        relations: ['driver', 'agent'],
      });
      if (!payout) return false;

      // Credit the wallet back only if it had been debited
      if ([PayoutStatus.APPROVED, PayoutStatus.PROCESSING].includes(payout.status)) {
        await this.adjustBalance(payout, Number(payout.amount), 'credit', manager);
      }
      await manager.update(Payout, payout.id, { status: PayoutStatus.DECLINED });

      const userId = payout.driver?.userId ?? payout.agent?.userId;
      if (userId) {
        await this.notificationService.notify({
          userId,
          title: 'Withdrawal Failed',
          body: `Your withdrawal of N${payout.amount} could not be completed and was reversed.`,
          type: NotificationType.PAYOUT_DECLINED,
          data: { payoutId: payout.id, reference: payout.reference },
        });
      }
      return true;
    });
  }

  async getBeneficiaries(userId: string) {
    const driver = await this.driverRepo.findOne({ where: { userId } });
    if (driver) return this.beneficiaryRepo.find({ where: { driverId: driver.id } });
    const agent = await this.agentRepo.findOne({ where: { userId } });
    if (agent) return this.beneficiaryRepo.find({ where: { agentId: agent.id } });
    return [];
  }



async getBankList() {
  return this.cache.getOrSet(
    CACHE_KEYS.BANK_LIST,
    () => this.paystackAdapter.getBankList(),
    CACHE_TTL.DAY,
  );
}

async getWalletTransactions(
  userId: string,
  params: { page?: number; limit?: number; search?: string; start_date?: string; end_date?: string },
) {
  const { entity, kind } = await this.resolveUserEntity(userId);

  const page = Number(params.page) > 0 ? Number(params.page) : 1;
  const limit = Number(params.limit) > 0 ? Number(params.limit) : 20;
  const skip = (page - 1) * limit;

  // ── Debits: withdrawals from the Payout table ──────────────────────────
  const payoutQb = this.dataSource
    .getRepository(Payout)
    .createQueryBuilder('p')
    .leftJoinAndSelect('p.beneficiary', 'beneficiary')
    .where(kind === 'driver' ? 'p.driverId = :id' : 'p.agentId = :id', { id: entity.id })
    .orderBy('p.createdAt', 'DESC');

  if (params.search) {
    payoutQb.andWhere(
      '(p.reference ILIKE :s OR p.reason ILIKE :s OR p.narration ILIKE :s OR p.status ILIKE :s)',
      { s: `%${params.search}%` },
    );
  }
  if (params.start_date) {
    payoutQb.andWhere('p.createdAt >= :start', { start: new Date(params.start_date) });
  }
  if (params.end_date) {
    const end = new Date(params.end_date);
    end.setHours(23, 59, 59, 999);
    payoutQb.andWhere('p.createdAt <= :end', { end });
  }

  const payouts = await payoutQb.getMany();

  const debits = payouts.map((p) => ({
    id: p.id,
    type: 'debit' as const,
    reference: p.reference,
    amount: Number(p.amount ?? 0),
    status: p.status,
    reason: p.reason ?? 'Withdrawal',
    narration: p.narration,
    bank: p.beneficiary?.bankName ?? null,
    account_number: p.beneficiary?.accountNumber ?? null,
    created_at: p.createdAt,
  }));

  // ── Credits: trip earnings recorded on completed, paid bookings ────────
  let credits: any[] = [];
  if (kind === 'driver') {
    const bookingQb = this.dataSource
      .getRepository(Booking)
      .createQueryBuilder('b')
      .innerJoinAndSelect('b.trip', 'trip')
      .where('trip.driverId = :id', { id: entity.id })
      .andWhere(`b.metadata ->> 'driverCredited' = 'true'`)
      .orderBy('b.updatedAt', 'DESC');

    if (params.search) {
      bookingQb.andWhere('(b.bookingCode ILIKE :s OR b.paymentReference ILIKE :s)', {
        s: `%${params.search}%`,
      });
    }
    if (params.start_date) {
      bookingQb.andWhere('b.updatedAt >= :start', { start: new Date(params.start_date) });
    }
    if (params.end_date) {
      const end = new Date(params.end_date);
      end.setHours(23, 59, 59, 999);
      bookingQb.andWhere('b.updatedAt <= :end', { end });
    }

    const creditedBookings = await bookingQb.getMany();

    credits = creditedBookings.map((b) => {
      const meta = (b.metadata ?? {}) as Record<string, any>;
      const gross = Number(b.amountPaid ?? 0);
      const chargeFee = Number(meta.platformFee ?? 0);
      const net = Number(meta.netDriverAmount ?? gross - chargeFee);
      return {
        id: b.id,
        type: 'credit' as const,
        reference: b.bookingCode,
        payment_reference: b.paymentReference ?? null,
        amount: net,                       // what actually entered the wallet
        gross_amount: gross,               // what the passenger paid
        charge_fee: chargeFee,             // platform charge deducted
        total_amount: Number(b.totalAmount ?? 0),
        discount_amount: Number(b.discountAmount ?? 0),
        extra_luggage_charge: Number(meta.extraLuggageCharge ?? 0),
        seats: b.seats,
        status: 'success',
        booking_status: b.status,
        payment_status: b.paymentStatus,
        payment_gateway: b.paymentGateway ?? null,
        ticket_status: b.ticketStatus ?? null,
        reason: 'Trip earnings',
        narration: `Earnings from booking ${b.bookingCode}`,
        trip: b.trip
          ? {
              id: b.trip.id,
              reference: b.trip.reference,
              departure_location: b.trip.departureLocation ?? null,
              pick_station: b.trip.pickStation ?? null,
              drop_off_station: b.trip.dropOffStation ?? null,
              departure_date: b.trip.departureDate ?? null,
              departure_time: b.trip.departureTime ?? null,
            }
          : null,
        bank: null,
        account_number: null,
        credited_at: meta.driverCreditedAt ?? null,
        created_at: meta.driverCreditedAt ? new Date(meta.driverCreditedAt) : b.updatedAt,
      };
    });
  }

  // ── Merge, sort, paginate ──────────────────────────────────────────────
  const merged = [...credits, ...debits].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  const total = merged.length;
  const data = merged.slice(skip, skip + limit);

  return {
    wallet: {
      balance: Number(entity.currentBalance ?? 0),
      accountType: kind,
    },
    data,
    meta: {
      page,
      limit,
      count: data.length,
      previousPage: page > 1 ? page - 1 : false,
      nextPage: skip + limit < total ? page + 1 : false,
      pageCount: Math.ceil(total / limit),
      totalRecords: total,
    },
  };
}


async getSingleTransaction(userId: string, id: string) {
  const { entity, kind } = await this.resolveUserEntity(userId);
 
  // 1. Withdrawal (debit)
  const payout = await this.dataSource.getRepository(Payout).findOne({
    where: { id },
    relations: ['beneficiary'],
  });
 
  if (payout) {
    const owns =
      kind === 'driver' ? payout.driverId === entity.id : payout.agentId === entity.id;
    if (!owns) throw new ForbiddenException('This transaction does not belong to you');
    return { transaction: this.mapPayoutToTransaction(payout) };
  }
 
  // 2. Trip earnings (credit) — only drivers have these
  if (kind !== 'driver') throw new NotFoundException('Transaction not found');
 
  const booking = await this.dataSource.getRepository(Booking).findOne({
    where: { id },
    relations: ['trip'],
  });
  if (!booking) throw new NotFoundException('Transaction not found');
  if (booking.trip?.driverId !== entity.id) {
    throw new ForbiddenException('This transaction does not belong to you');
  }
 
  // The escrow row is the second source of truth: bookings completed through
  // the trip-module path never get `driverCredited` metadata, so checking
  // metadata alone 404s a real transaction and zeroes out the amounts.
  const escrow = await this.dataSource.getRepository(Escrow).findOne({
    where: { bookingId: booking.id },
  });
 
  const credited =
    booking.metadata?.driverCredited === true ||
    booking.metadata?.driverCredited === 'true' ||
    escrow?.status === EscrowStatus.RELEASED;
 
  if (!credited) throw new NotFoundException('Transaction not found');
 
  return { transaction: this.mapBookingToTransaction(booking, escrow) };
}
 

// async getSingleTransaction(userId: string, id: string) {
//   const { entity, kind } = await this.resolveUserEntity(userId);

//   const tx = await this.dataSource.getRepository(Payout).findOne({
//     where: { id },
//     relations: ['beneficiary'],
//   });

//   if (tx) {
//     const owns = kind === 'driver' ? tx.driverId === entity.id : tx.agentId === entity.id;
//     if (!owns) throw new ForbiddenException('This transaction does not belong to you');
//     return this.mapPayoutToDebit(tx);
//   }

//   // Not a payout — try trip-earnings credit (booking id)
//   if (kind !== 'driver') throw new NotFoundException('Transaction not found');

//   const booking = await this.dataSource.getRepository(Booking).findOne({
//     where: { id },
//     relations: ['trip'],
//   });
//   if (!booking || booking.metadata?.driverCredited !== true && booking.metadata?.driverCredited !== 'true')
//     throw new NotFoundException('Transaction not found');
//   if (booking.trip?.driverId !== entity.id)
//     throw new ForbiddenException('This transaction does not belong to you');

//   return this.mapBookingToCredit(booking);
// }

  // ─── Helpers ──────────────────────────────────────────────────────────────
  private async resolveEntity(userId: string, manager: EntityManager) {
    const driver = await manager.findOne(Driver, { where: { userId }, lock: { mode: 'pessimistic_write' } });
    if (driver) return { entity: driver as PayoutEntity, kind: 'driver' as EntityKind };
    const agent = await manager.findOne(Agent, { where: { userId }, lock: { mode: 'pessimistic_write' },});
    if (agent) return { entity: agent as PayoutEntity, kind: 'agent' as EntityKind };
    throw new NotFoundException('No payout account found for this user');
  }

  private async resolveUserEntity(userId: string) {
  const driver = await this.driverRepo.findOne({ where: { userId } });
  if (driver) return { entity: driver as Driver | Agent, kind: 'driver' as const };
  const agent = await this.agentRepo.findOne({ where: { userId } });
  if (agent) return { entity: agent as Driver | Agent, kind: 'agent' as const };
  throw new NotFoundException('No wallet account found for this user');
}

private mapBookingToTransaction(b: Booking, escrow?: Escrow | null): TransactionShape {
  const { gross, platformCharge, driverEarned } = this.resolveEarnings(b, escrow);
  const meta = (b.metadata ?? {}) as Record<string, any>;
 
  return {
    id: b.id,
    type: 'credit',
    amount: driverEarned,        // what actually hit the wallet
    status: 'success',
    narration: `Earnings from booking ${b.bookingCode} (fare ₦${gross})`,
    platform_charge: platformCharge,
    driver_earned: driverEarned,
    created_at: meta.driverCreditedAt ?? escrow?.releasedAt ?? b.updatedAt,
    updated_at: b.updatedAt,
    // no bank details on a credit, but keep the key present so the client's
    // optional field never flips between undefined and missing
    payment_details: undefined,
  };
}

private resolveEarnings(b: Booking, escrow?: Escrow | null) {
  const meta = (b.metadata ?? {}) as Record<string, any>;
  const gross = this.firstNumber(b.amountPaid, escrow?.amount, b.totalAmount);
 
  const platformCharge = this.firstNumber(
    meta.platformFee,
    escrow?.platformFee,
    (gross * PLATFORM_FEE_RATE) / 100,
  );
 
  const driverEarned = this.firstNumber(
    meta.netDriverAmount,
    escrow?.netDriverAmount,
    gross - platformCharge,
  );
 
  return { gross, platformCharge, driverEarned };
}
 
/** First value that coerces to a real number. Decimal columns arrive as strings. */
private firstNumber(...values: any[]): number {
  for (const v of values) {
    if (v === null || v === undefined || v === '') continue;
    const n = Number(v);
    if (!Number.isNaN(n)) return n;
  }
  return 0;
}
// private async createPayoutRecord(
//   entity: PayoutEntity,
//   kind: EntityKind,
//   dto: InitiatePayoutDto,
//   resolved: { account_number: string; account_name: string; },
//   manager: EntityManager,
  
// ): Promise<Payout> {
//   const reference = this.randomness.generateReference('PAYOUT').toLowerCase();
//   const payout = manager.create(Payout, {
//     reference,
//     amount: dto.amount,
//     narration: dto.narration ?? 'Wallet withdrawal',
//     status: PayoutStatus.PENDING,
//     paymentMethod: 'bank_transfer',
//     driverId: kind === 'driver' ? entity.id : null,
//     agentId: kind === 'agent' ? entity.id : null,
//     payoutableType: kind,
//     payoutableId: entity.id,
//     paymentDetails: {
//       account_number: dto.accountNumber,
//       bank_name: dto.bankName ?? 'Unknown Bank',
//       bank_code: dto.bankCode,
//       bank_holder_name: resolved.account_name,
//       currency: 'NGN',
//       debit_currency: 'NGN',
//     } as any,
//   });
//   const saved = await manager.save(Payout, payout);

//   await this.notificationService.notifyAdmins({
//     title: 'Withdrawal Application',
//     body: `${(entity as any).user?.firstName ?? 'A user'} applied to withdraw N${dto.amount} (ref ${reference}).`,
//     type: NotificationType.BROADCAST,
//     data: { payoutId: saved.id, reference },
//   });
//   return saved;
// }

private async createPayoutRecord(
  entity: PayoutEntity,
  kind: EntityKind,
  dto: InitiatePayoutDto,
  resolved: { account_number: string; account_name: string; },
  manager: EntityManager,
  beneficiary?: Beneficiary | null,
): Promise<Payout> {
  const reference = this.randomness.generateReference('PAYOUT').toLowerCase();
  const payout = manager.create(Payout, {
    reference,
    amount: dto.amount,
    narration: dto.narration ?? 'Wallet withdrawal',
    status: PayoutStatus.PENDING,
    paymentMethod: 'bank_transfer',
    driverId: kind === 'driver' ? entity.id : null,
    agentId: kind === 'agent' ? entity.id : null,
    payoutableType: kind,
    payoutableId: entity.id,
    beneficiaryId: beneficiary?.id ?? null,
    paymentDetails: {
      account_number: dto.accountNumber,
      bank_name: dto.bankName ?? 'Unknown Bank',
      bank_code: dto.bankCode,
      bank_holder_name: resolved.account_name,
      currency: 'NGN',
      debit_currency: 'NGN',
    } as any,
  });
  const saved = await manager.save(Payout, payout);

  await this.notificationService.notifyAdmins({
    title: 'Withdrawal Application',
    body: `${(entity as any).user?.firstName ?? 'A user'} applied to withdraw N${dto.amount} (ref ${reference}).`,
    type: NotificationType.BROADCAST,
    data: { payoutId: saved.id, reference },
  });
  return saved;
}

private mapPayoutToTransaction(p: Payout): TransactionShape {
  // createPayoutRecord() no longer sets beneficiaryId — it writes the bank
  // details into paymentDetails. Reading only p.beneficiary is why
  // bank_name / account_number always came back null.
  const details = (p.paymentDetails ?? {}) as Record<string, any>;
 
  return {
    id: p.id,
    type: 'debit',
    amount: Number(p.amount ?? 0),
    status: p.status,
    narration: p.narration ?? p.reason ?? 'Wallet withdrawal',
    platform_charge: 0,          // withdrawals carry no platform fee
    driver_earned: 0,            // and are not earnings
    created_at: p.createdAt,
    updated_at: p.updatedAt,
    payment_details: {
      bank_name: details.bank_name ?? p.beneficiary?.bankName ?? null,
      account_number: details.account_number ?? p.beneficiary?.accountNumber ?? null,
      bank_code: details.bank_code ?? p.beneficiary?.bankCode ?? null,
    },
  };
}


  private async createBeneficiary(
    entity: PayoutEntity,
    kind: EntityKind,
    dto: InitiatePayoutDto,
    manager: EntityManager,
  ): Promise<Beneficiary> {
    if (!dto.accountNumber || !dto.bankCode) {
      throw new BadRequestException('Provide a beneficiaryId or full bank details');
    }
    const where =
      kind === 'driver'
        ? { driverId: entity.id, accountNumber: dto.accountNumber, bankCode: dto.bankCode }
        : { agentId: entity.id, accountNumber: dto.accountNumber, bankCode: dto.bankCode };

    const existing = await manager.findOne(Beneficiary, { where });
    if (existing) {
      await manager.update(Beneficiary, existing.id, {
        bankName: dto.bankName,
        bankHolderName: dto.bankHolderName,
      });
      return manager.findOne(Beneficiary, { where: { id: existing.id } });
    }

    const beneficiary = manager.create(Beneficiary, {
      beneficiaryableId: entity.id,
      beneficiaryableType: kind,
      ownerType: kind === 'driver' ? BeneficiaryType.DRIVER : BeneficiaryType.AGENT,
      driverId: kind === 'driver' ? entity.id : null,
      agentId: kind === 'agent' ? entity.id : null,
      accountNumber: dto.accountNumber,
      bankCode: dto.bankCode,
      bankName: dto.bankName,
      bankHolderName: dto.bankHolderName,
    });
    return manager.save(Beneficiary, beneficiary);
  }

  private async adjustBalance(
    payout: Payout,
    amount: number,
    op: 'debit' | 'credit',
    manager: EntityManager,
  ): Promise<void> {
    if (payout.driverId) {
      op === 'debit'
        ? await manager.decrement(Driver, { id: payout.driverId }, 'currentBalance', amount)
        : await manager.increment(Driver, { id: payout.driverId }, 'currentBalance', amount);
    } else if (payout.agentId) {
      op === 'debit'
        ? await manager.decrement(Agent, { id: payout.agentId }, 'currentBalance', amount)
        : await manager.increment(Agent, { id: payout.agentId }, 'currentBalance', amount);
    }
  }

  private mapPayoutToDebit(p: Payout) {
  return {
    id: p.id,
    type: 'debit' as const,
    reference: p.reference,
    amount: Number(p.amount ?? 0),
    status: p.status,
    reason: p.reason ?? 'Withdrawal',
    narration: p.narration,
    bank: p.beneficiary?.bankName ?? null,
    account_number: p.beneficiary?.accountNumber ?? null,
    created_at: p.createdAt,
  };
}

private mapBookingToCredit(b: Booking) {
  const meta = (b.metadata ?? {}) as Record<string, any>;
  const gross = Number(b.amountPaid ?? 0);
  const chargeFee = Number(meta.platformFee ?? 0);
  const net = Number(meta.netDriverAmount ?? gross - chargeFee);

  return {
    id: b.id,
    type: 'credit' as const,
    reference: b.bookingCode,
    payment_reference: b.paymentReference ?? null,
    amount: net,
    gross_amount: gross,
    charge_fee: chargeFee,
    total_amount: Number(b.totalAmount ?? 0),
    discount_amount: Number(b.discountAmount ?? 0),
    extra_luggage_charge: Number(meta.extraLuggageCharge ?? 0),
    seats: b.seats,
    status: 'success',
    booking_status: b.status,
    payment_status: b.paymentStatus,
    payment_gateway: b.paymentGateway ?? null,
    ticket_status: b.ticketStatus ?? null,
    reason: 'Trip earnings',
    narration: `Earnings from booking ${b.bookingCode}`,
    trip: b.trip
      ? {
          id: b.trip.id,
          reference: b.trip.reference,
          departure_location: b.trip.departureLocation ?? null,
          pick_station: b.trip.pickStation ?? null,
          drop_off_station: b.trip.dropOffStation ?? null,
          departure_date: b.trip.departureDate ?? null,
          departure_time: b.trip.departureTime ?? null,
        }
      : null,
    bank: null,
    account_number: null,
    credited_at: meta.driverCreditedAt ?? null,
    created_at: meta.driverCreditedAt ? new Date(meta.driverCreditedAt) : b.updatedAt,
  };
}
  
}



// import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
// import { InjectRepository } from '@nestjs/typeorm';
// import { DataSource, EntityManager, Repository } from 'typeorm';

// import { Driver } from '@modules/core/entities/driver.entity';
// import { Agent } from '@modules/core/entities/agent.entity';
// import { Payout } from '@modules/core/entities/payout.entity';
// import { Beneficiary, BeneficiaryType } from '@modules/core/entities/beneficiary.entity';
// import { Booking } from '@modules/core/entities/booking.entity';

// import { PaystackAdapter } from '@adapters/payment/paystack/paystack.adapter';
// import { NotificationService } from '@modules/notification/services/notification.service';
// import { RandomnessUtil } from '@shared/utils/encryption/randomness.util';
// import { BookingStatus, NotificationType, PaymentStatus, PayoutStatus } from 'src/types/enums';
// import { InitiatePayoutDto } from '../dtos/payout.dto';
// import { RedisCacheService } from '@modules/cache/redis-cache.service';
// import { CACHE_KEYS, CACHE_TTL } from '@modules/cache/redis-cache.constants';

// type PayoutEntity = Driver | Agent;
// type EntityKind = 'driver' | 'agent';

// @Injectable()
// export class PayoutService {
//   private readonly logger = new Logger(PayoutService.name);

//   constructor(
//     @InjectRepository(Driver) private readonly driverRepo: Repository<Driver>,
//     @InjectRepository(Agent) private readonly agentRepo: Repository<Agent>,
//     @InjectRepository(Beneficiary) private readonly beneficiaryRepo: Repository<Beneficiary>,
//     private readonly dataSource: DataSource,
//     private readonly paystackAdapter: PaystackAdapter,
//     private readonly notificationService: NotificationService,
//     private readonly randomness: RandomnessUtil,
//     private readonly cache: RedisCacheService,
    
//   ) {}

//   // ─── Driver/Agent requests a withdrawal ───────────────────────────────────
//   async initiatePayout(userId: string, dto: InitiatePayoutDto) {
//     return this.dataSource.transaction(async (manager) => {
//       const { entity, kind } = await this.resolveEntity(userId, manager);

//       const beneficiary = dto.beneficiaryId
//         ? await manager.findOne(Beneficiary, { where: { id: dto.beneficiaryId } })
//         : await this.createBeneficiary(entity, kind, dto, manager);
//       if (!beneficiary) throw new NotFoundException('Beneficiary not found');

//       if (Number(entity.currentBalance) < Number(dto.amount)) {
//         return { message: 'Insufficient balance', status: false };
//       }

//       const payout = await this.createPayoutRecord(entity, kind, beneficiary, dto, manager);

//       // Drivers (and refunds) dispense immediately; agents wait for admin approval.
//       if (kind === 'driver' || dto.refund) {
//         return this.dispenseFundFromPayout(payout.id, manager);
//       }
//       return { message: 'Payout initiated successfully', status: true };
//     });
//   }

//   // ─── Actually push money to the bank via Paystack ─────────────────────────
//   async dispenseFundFromPayout(payoutId: string, em?: EntityManager) {
//     const run = async (manager: EntityManager) => {
//       const payout = await manager.findOne(Payout, {
//         where: { id: payoutId },
//         relations: ['driver', 'agent', 'beneficiary'],
//       });
//       if (!payout) throw new NotFoundException('Payout not found');
//       const details = (payout.paymentDetails ?? {}) as Record<string, any>;

//       // 1. Gateway must have funds (amounts in Naira)
//       const { balance } = await this.paystackAdapter.checkBalance();
//       if (balance < Number(payout.amount)) {
//         return { message: "Can't process this request right now, try again later.", status: false };
//       }

//       // 2. Reuse or create a transfer recipient
//       let recipientCode = payout.recipientCode ?? payout.beneficiary?.recipientCode;
//       if (!recipientCode) {
//         const created = await this.paystackAdapter.createTransferRecipient({
//           name: details.bank_holder_name || payout.beneficiary?.bankHolderName || 'Beneficiary',
//           account_number: details.account_number,
//           bank_code: details.bank_code,
//         });
//         recipientCode = created.recipient_code;
//         if (payout.beneficiaryId) await manager.update(Beneficiary, payout.beneficiaryId, { recipientCode });
//       }

//       // 3. Initiate transfer (provider converts Naira → kobo)
//       let transfer: { transfer_code: string; status: string };
//       try {
//         transfer = await this.paystackAdapter.initiatePayout({
//           recipient_code: recipientCode,
//           account_number: details.account_number,
//           bank_code: details.bank_code,
//           amount: Number(payout.amount),
//           reason: payout.narration ?? 'Payout',
//         });
//       } catch (err) {
//         this.logger.error(`Payout transfer failed for ${payout.reference}: ${err?.message}`);
//         return { message: `Payment gateway error: ${err?.message}`, status: false };
//       }

//       // 4. Mark approved + debit wallet (debited HERE, so the transfer.success
//       //    webhook will skip it — see completePayout's pending-only claim).
//       await manager.update(Payout, payout.id, {
//         status: PayoutStatus.APPROVED,
//         transferCode: transfer.transfer_code,
//         recipientCode,
//         transactionDate: new Date(),
//       });
//       await this.adjustBalance(payout, Number(payout.amount), 'debit', manager);

//       const userId = payout.driver?.userId ?? payout.agent?.userId;
//       if (userId) {
//         await this.notificationService.notify({
//           userId,
//           title: 'Withdrawal Successful',
//           body: `Your withdrawal of N${payout.amount} has been processed.`,
//           type: NotificationType.PAYOUT_APPROVED,
//           data: { payoutId: payout.id, reference: payout.reference },
//         });
//       }
//       return { message: transfer.status ?? 'Transfer queued', status: true };
//     };
//     return em ? run(em) : this.dataSource.transaction(run);
//   }

//   // ─── Webhook: transfer.success / paymentrequest.success ───────────────────
//   // Idempotent: atomically claims a PENDING payout, so a retried webhook (or a
//   // payout already settled in dispenseFundFromPayout) is a harmless no-op.
//   async completePayout(reference: string, em?: EntityManager): Promise<boolean> {
//     const run = async (manager: EntityManager): Promise<boolean> => {
//       const claim = await manager.update(
//         Payout,
//         { reference, status: PayoutStatus.PENDING },
//         { status: PayoutStatus.APPROVED, transactionDate: new Date() },
//       );
//       if (!claim.affected) {
//         this.logger.log(`completePayout: ${reference} not pending — skipped`);
//         return false;
//       }

//       const payout = await manager.findOne(Payout, {
//         where: { reference },
//         relations: ['driver', 'agent'],
//       });

//       if (reference.toLowerCase().includes('refund-')) {
//         const code = reference.replace(/refund-/i, '');
//         await manager.update(
//           Booking,
//           { bookingCode: code },
//           { status: BookingStatus.REFUNDED, paymentStatus: PaymentStatus.REFUNDED },
//         );
//         this.logger.log(`Refund settled for booking ${code}`);
//       } else {
//         await this.adjustBalance(payout, Number(payout.amount), 'debit', manager);
//       }

//       const userId = payout.driver?.userId ?? payout.agent?.userId;
//       if (userId) {
//         await this.notificationService.notify({
//           userId,
//           title: 'Withdrawal Successful',
//           body: `Your withdrawal of N${payout.amount} has been processed.`,
//           type: NotificationType.PAYOUT_APPROVED,
//           data: { payoutId: payout.id, reference: payout.reference },
//         });
//       }
//       return true;
//     };
//     try {
//       return em ? await run(em) : await this.dataSource.transaction(run);
//     } catch (err) {
//       this.logger.error(`completePayout failed for ${reference}: ${err?.message}`);
//       return false;
//     }
//   }

//   // ─── Webhook: transfer.failed / transfer.reversed ─────────────────────────
//   async reversePayout(reference: string): Promise<boolean> {
//     return this.dataSource.transaction(async (manager) => {
//       const payout = await manager.findOne(Payout, {
//         where: { reference },
//         relations: ['driver', 'agent'],
//       });
//       if (!payout) return false;

//       // Credit the wallet back only if it had been debited
//       if ([PayoutStatus.APPROVED, PayoutStatus.PROCESSING].includes(payout.status)) {
//         await this.adjustBalance(payout, Number(payout.amount), 'credit', manager);
//       }
//       await manager.update(Payout, payout.id, { status: PayoutStatus.DECLINED });

//       const userId = payout.driver?.userId ?? payout.agent?.userId;
//       if (userId) {
//         await this.notificationService.notify({
//           userId,
//           title: 'Withdrawal Failed',
//           body: `Your withdrawal of N${payout.amount} could not be completed and was reversed.`,
//           type: NotificationType.PAYOUT_DECLINED,
//           data: { payoutId: payout.id, reference: payout.reference },
//         });
//       }
//       return true;
//     });
//   }

//   async getBeneficiaries(userId: string) {
//     const driver = await this.driverRepo.findOne({ where: { userId } });
//     if (driver) return this.beneficiaryRepo.find({ where: { driverId: driver.id } });
//     const agent = await this.agentRepo.findOne({ where: { userId } });
//     if (agent) return this.beneficiaryRepo.find({ where: { agentId: agent.id } });
//     return [];
//   }

// //   async getBankList() {
// //   return this.paystackAdapter.getBankList();
// // }

// async getBankList() {
//   return this.cache.getOrSet(
//     CACHE_KEYS.BANK_LIST,
//     () => this.paystackAdapter.getBankList(),
//     CACHE_TTL.DAY,
//   );
// }

// async getWalletTransactions(
//   userId: string,
//   params: { page?: number; limit?: number; search?: string; start_date?: string; end_date?: string },
// ) {
//   const { entity, kind } = await this.resolveUserEntity(userId);

//   const page = Number(params.page) > 0 ? Number(params.page) : 1;
//   const limit = Number(params.limit) > 0 ? Number(params.limit) : 20;
//   const skip = (page - 1) * limit;

//   const repo = this.dataSource.getRepository(Payout);
//   const qb = repo
//     .createQueryBuilder('p')
//     .leftJoinAndSelect('p.beneficiary', 'beneficiary')
//     .where(kind === 'driver' ? 'p.driverId = :id' : 'p.agentId = :id', { id: entity.id })
//     .orderBy('p.createdAt', 'DESC')
//     .skip(skip)
//     .take(limit);

//   if (params.search) {
//     qb.andWhere(
//       '(p.reference ILIKE :s OR p.reason ILIKE :s OR p.narration ILIKE :s OR p.status ILIKE :s)',
//       { s: `%${params.search}%` },
//     );
//   }
//   if (params.start_date) {
//     qb.andWhere('p.createdAt >= :start', { start: new Date(params.start_date) });
//   }
//   if (params.end_date) {
//     // include the whole end day
//     const end = new Date(params.end_date);
//     end.setHours(23, 59, 59, 999);
//     qb.andWhere('p.createdAt <= :end', { end });
//   }

//   const [data, total] = await qb.getManyAndCount();

//   return {
//     wallet: {
//       balance: Number(entity.currentBalance ?? 0),
//       accountType: kind,
//     },
//     data: data.map((p) => ({
//       id: p.id,
//       reference: p.reference,
//       amount: Number(p.amount ?? 0),
//       status: p.status,
//       reason: p.reason,
//       narration: p.narration,
//       bank: p.beneficiary?.bankName ?? null,
//       account_number: p.beneficiary?.accountNumber ?? null,
//       created_at: p.createdAt,
//     })),
//     meta: {
//       page,
//       limit,
//       count: data.length,
//       previousPage: page > 1 ? page - 1 : false,
//       nextPage: skip + limit < total ? page + 1 : false,
//       pageCount: Math.ceil(total / limit),
//       totalRecords: total,
//     },
//   };
// }

// async getSingleTransaction(userId: string, id: string) {
//   const { entity, kind } = await this.resolveUserEntity(userId);

//   const tx = await this.dataSource.getRepository(Payout).findOne({
//     where: { id },
//     relations: ['beneficiary', 'driver', 'driver.user', 'agent', 'agent.user'],
//   });
//   if (!tx) throw new NotFoundException('Transaction not found');

//   const owns = kind === 'driver' ? tx.driverId === entity.id : tx.agentId === entity.id;
//   if (!owns) throw new ForbiddenException('This transaction does not belong to you');

//   return {
//     id: tx.id,
//     reference: tx.reference,
//     amount: Number(tx.amount ?? 0),
//     status: tx.status,
//     reason: tx.reason,
//     narration: tx.narration,
//     transfer_code: tx.transferCode,
//     payment_method: tx.paymentMethod,
//     beneficiary: tx.beneficiary
//       ? {
//           bank_name: tx.beneficiary.bankName,
//           account_number: tx.beneficiary.accountNumber,
//           account_holder: tx.beneficiary.bankHolderName,
//         }
//       : null,
//     created_at: tx.createdAt,
//     updated_at: tx.updatedAt,
//   };
// }

//   // ─── Helpers ──────────────────────────────────────────────────────────────
//   private async resolveEntity(userId: string, manager: EntityManager) {
//     const driver = await manager.findOne(Driver, { where: { userId }, relations: ['user'] });
//     if (driver) return { entity: driver as PayoutEntity, kind: 'driver' as EntityKind };
//     const agent = await manager.findOne(Agent, { where: { userId }, relations: ['user'] });
//     if (agent) return { entity: agent as PayoutEntity, kind: 'agent' as EntityKind };
//     throw new NotFoundException('No payout account found for this user');
//   }

//   private async resolveUserEntity(userId: string) {
//   const driver = await this.driverRepo.findOne({ where: { userId } });
//   if (driver) return { entity: driver as Driver | Agent, kind: 'driver' as const };
//   const agent = await this.agentRepo.findOne({ where: { userId } });
//   if (agent) return { entity: agent as Driver | Agent, kind: 'agent' as const };
//   throw new NotFoundException('No wallet account found for this user');
// }

//   private async createPayoutRecord(
//     entity: PayoutEntity,
//     kind: EntityKind,
//     beneficiary: Beneficiary,
//     dto: InitiatePayoutDto,
//     manager: EntityManager,
//   ): Promise<Payout> {
//     const reference = this.randomness.generateReference('PAYOUT').toLowerCase();
//     const payout = manager.create(Payout, {
//       reference,
//       amount: dto.amount,
//       narration: dto.narration ?? 'Wallet withdrawal',
//       status: PayoutStatus.PENDING,
//       paymentMethod: 'bank_transfer',
//       beneficiaryId: beneficiary.id,
//       driverId: kind === 'driver' ? entity.id : null,
//       agentId: kind === 'agent' ? entity.id : null,
//       payoutableType: kind,
//       payoutableId: entity.id,
//       paymentDetails: {
//         account_number: beneficiary.accountNumber,
//         bank_name: beneficiary.bankName ?? 'Unknown Bank',
//         bank_code: beneficiary.bankCode,
//         bank_holder_name: beneficiary.bankHolderName ?? '',
//         currency: 'NGN',
//         debit_currency: 'NGN',
//       } as any,
//     });
//     const saved = await manager.save(Payout, payout);

//     await this.notificationService.notifyAdmins({
//       title: 'Withdrawal Application',
//       body: `${(entity as any).user?.firstName ?? 'A user'} applied to withdraw N${dto.amount} (ref ${reference}).`,
//       type: NotificationType.BROADCAST,
//       data: { payoutId: saved.id, reference },
//     });
//     return saved;
//   }

//   private async createBeneficiary(
//     entity: PayoutEntity,
//     kind: EntityKind,
//     dto: InitiatePayoutDto,
//     manager: EntityManager,
//   ): Promise<Beneficiary> {
//     if (!dto.accountNumber || !dto.bankCode) {
//       throw new BadRequestException('Provide a beneficiaryId or full bank details');
//     }
//     const where =
//       kind === 'driver'
//         ? { driverId: entity.id, accountNumber: dto.accountNumber, bankCode: dto.bankCode }
//         : { agentId: entity.id, accountNumber: dto.accountNumber, bankCode: dto.bankCode };

//     const existing = await manager.findOne(Beneficiary, { where });
//     if (existing) {
//       await manager.update(Beneficiary, existing.id, {
//         bankName: dto.bankName,
//         bankHolderName: dto.bankHolderName,
//       });
//       return manager.findOne(Beneficiary, { where: { id: existing.id } });
//     }

//     const beneficiary = manager.create(Beneficiary, {
//       beneficiaryableId: entity.id,
//       beneficiaryableType: kind,
//       ownerType: kind === 'driver' ? BeneficiaryType.DRIVER : BeneficiaryType.AGENT,
//       driverId: kind === 'driver' ? entity.id : null,
//       agentId: kind === 'agent' ? entity.id : null,
//       accountNumber: dto.accountNumber,
//       bankCode: dto.bankCode,
//       bankName: dto.bankName,
//       bankHolderName: dto.bankHolderName,
//     });
//     return manager.save(Beneficiary, beneficiary);
//   }

//   private async adjustBalance(
//     payout: Payout,
//     amount: number,
//     op: 'debit' | 'credit',
//     manager: EntityManager,
//   ): Promise<void> {
//     if (payout.driverId) {
//       op === 'debit'
//         ? await manager.decrement(Driver, { id: payout.driverId }, 'currentBalance', amount)
//         : await manager.increment(Driver, { id: payout.driverId }, 'currentBalance', amount);
//     } else if (payout.agentId) {
//       op === 'debit'
//         ? await manager.decrement(Agent, { id: payout.agentId }, 'currentBalance', amount)
//         : await manager.increment(Agent, { id: payout.agentId }, 'currentBalance', amount);
//     }
//   }

  
// }