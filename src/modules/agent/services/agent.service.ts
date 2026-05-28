import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { Agent } from '@modules/core/entities/agent.entity';
import { Booking } from '@modules/core/entities/booking.entity';
import { Trip } from '@modules/core/entities/trip.entity';
import { Passenger } from '@modules/core/entities/passenger.entity';
import { Payout } from '@modules/core/entities/payout.entity';
import { AgentCommission } from '../../core/entities/agent-commission.entity';
import { PaymentFactory } from '@adapters/payment/payment.factory';
import { RandomnessUtil } from '@shared/utils/encryption/randomness.util';
import { BookingStatus, PayoutStatus, TripStatus } from '../../../types/enums';
import { BookAgentTripDto, AgentWithdrawDto, UpdateAgentBankDto } from '../dtos/agent.dto';

/** Platform commission rate (percentage agent earns per booking) */
const AGENT_COMMISSION_RATE = parseFloat(process.env.AGENT_COMMISSION_RATE ?? '5'); // 5%

@Injectable()
export class AgentService {
  constructor(
    @InjectRepository(Agent) private readonly agentRepo: Repository<Agent>,
    @InjectRepository(Booking) private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(Trip) private readonly tripRepo: Repository<Trip>,
    @InjectRepository(Passenger) private readonly passengerRepo: Repository<Passenger>,
    @InjectRepository(Payout) private readonly payoutRepo: Repository<Payout>,
    @InjectRepository(AgentCommission)
    private readonly commissionRepo: Repository<AgentCommission>,
    private readonly paymentFactory: PaymentFactory,
    private readonly randomnessUtil: RandomnessUtil,
  ) {}

  // ─── Profile ─────────────────────────────────────────────────────────────────

  async getProfile(id: string) {
    const agent = await this.agentRepo.findOne({
      where: { id },
      relations: ['users'],
    });
    if (!agent) throw new NotFoundException('Agent profile not found');
    return agent;
  }

  async updateBankDetails(userId: string, dto: UpdateAgentBankDto) {
    const agent = await this.getAgentByUserId(userId);
    Object.assign(agent, dto);
    return this.agentRepo.save(agent);
  }

  // ─── Book trip on behalf of a passenger ──────────────────────────────────────

  /**
   * AGENT BOOKING FLOW:
   *  1. Agent finds a trip and books seats for a passenger.
   *  2. Payment link is generated — the passenger (or agent on their behalf) pays.
   *  3. On payment success webhook, the booking is confirmed and agent earns commission.
   *
   * The platform holds all funds (escrow). Commission is credited to the agent wallet
   * after the trip completes successfully.
   */
  async bookTripForPassenger(
    agentUserId: string,
    dto: BookAgentTripDto,
    entityManager?: EntityManager,
  ) {
    const manager = entityManager ?? this.agentRepo.manager;

    const agent = await this.getAgentByUserId(agentUserId);

    const trip = await this.tripRepo.findOne({ where: { id: dto.tripId } });
    if (!trip) throw new NotFoundException('Trip not found');
    if (trip.status !== TripStatus.ACTIVE)
      throw new BadRequestException('Trip is not accepting bookings');

    const availableSeats = trip.totalSeats - trip.bookedSeats;
    if (dto.seats > availableSeats)
      throw new BadRequestException(`Only ${availableSeats} seat(s) available`);

    // Resolve or create passenger
    const passenger = await this.passengerRepo.findOne({
      where: { userId: dto.passengerUserId },
    });
    if (!passenger) throw new NotFoundException('Passenger not found');

    const totalAmount = trip.pricePerSeat * dto.seats;
    const couponDiscount = await this.applyCouponDiscount(dto.couponCode);
    const amountPaid = totalAmount - couponDiscount;
    const bookingCode = this.randomnessUtil.generateBookingCode(8);
    const paymentReference = this.randomnessUtil.generateReference('AGENT-BKG');

    // Create booking (status: pending until payment confirmed)
    const booking = manager.create(Booking, {
      bookingCode,
      tripId: trip.id,
      passengerId: passenger.id,
      seats: dto.seats,
      totalAmount,
      discountAmount: couponDiscount,
      amountPaid,
      status: BookingStatus.PENDING,
      paymentReference,
      couponCode: dto.couponCode,
      metadata: { bookedByAgent: true, agentId: agent.id },
    });
    const savedBooking = await manager.save(Booking, booking);

    // Hold-slot: increment trip bookedSeats
    await manager.increment(Trip, { id: trip.id }, 'bookedSeats', dto.seats);

    // Create pending commission record (released on trip completion)
    const commissionAmount = (amountPaid * AGENT_COMMISSION_RATE) / 100;
    await manager.save(AgentCommission, {
      agentId: agent.id,
      bookingId: savedBooking.id,
      bookingAmount: amountPaid,
      commissionRate: AGENT_COMMISSION_RATE,
      commissionAmount,
      status: 'pending',
      description: `Commission for booking ${bookingCode}`,
    });

    // Update agent referral count
    await manager.increment(Agent, { id: agent.id }, 'totalReferrals', 1);

    // Generate payment link
    const payment = await this.paymentFactory.initiatePayment({
      amount: amountPaid,
      email: dto.passengerEmail,
      reference: paymentReference,
      callback_url: dto.callbackUrl,
      metadata: { bookingCode, agentId: agent.id, bookedByAgent: true },
    });

    return { booking: savedBooking, payment, commissionPending: commissionAmount };
  }

  // ─── Commission ───────────────────────────────────────────────────────────────

  async getCommissions(userId: string, query: { page?: number; limit?: number; status?: string }) {
    const agent = await this.getAgentByUserId(userId);
    const { page = 1, limit = 20, status } = query;
    const skip = (page - 1) * limit;

    const where: any = { agentId: agent.id };
    if (status) where.status = status;

    const [data, total] = await this.commissionRepo.findAndCount({
      where,
      skip,
      take: limit,
      relations: ['booking'],
      order: { createdAt: 'DESC' },
    });

    return { data, meta: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  /** Called by the booking completion webhook to release pending commission */
  async releaseCommission(bookingId: string, entityManager?: EntityManager) {
    const manager = entityManager ?? this.agentRepo.manager;
    const commission = await this.commissionRepo.findOne({
      where: { bookingId, status: 'pending' },
    });
    if (!commission) return; // No agent commission for this booking

    commission.status = 'released';
    await manager.save(AgentCommission, commission);

    // Credit agent wallet
    await manager.increment(
      Agent,
      { id: commission.agentId },
      'walletBalance',
      Number(commission.commissionAmount),
    );
    await manager.increment(
      Agent,
      { id: commission.agentId },
      'totalCommission',
      Number(commission.commissionAmount),
    );
  }

  // ─── Wallet & Withdrawal ─────────────────────────────────────────────────────

  async getWallet(userId: string) {
    const agent = await this.getAgentByUserId(userId);
    const totalPending = await this.commissionRepo
      .createQueryBuilder('c')
      .select('SUM(c.commissionAmount)', 'total')
      .where('c.agentId = :id AND c.status = :s', { id: agent.id, s: 'pending' })
      .getRawOne();

    return {
      walletBalance: agent.walletBalance,
      totalCommission: agent.totalCommission,
      pendingCommission: parseFloat(totalPending?.total ?? '0'),
      totalReferrals: agent.totalReferrals,
    };
  }

  async requestWithdrawal(userId: string, dto: AgentWithdrawDto) {
    const agent = await this.getAgentByUserId(userId);

    if (!agent.bankAccountNumber || !agent.bankCode)
      throw new BadRequestException('Please add bank details before requesting a withdrawal');

    if (agent.walletBalance < dto.amount)
      throw new BadRequestException('Insufficient wallet balance');

    const MIN_WITHDRAWAL = 1000; // NGN
    if (dto.amount < MIN_WITHDRAWAL)
      throw new BadRequestException(`Minimum withdrawal is NGN ${MIN_WITHDRAWAL}`);

    const reference = this.randomnessUtil.generateReference('AGT-PAY');

    const payout = this.payoutRepo.create({
      reference,
      driverId: null as any, // Payout table is shared — driverId used loosely
      amount: dto.amount,
      reason: dto.reason || 'Agent commission withdrawal',
      status: PayoutStatus.PENDING,
      metadata: { agentId: agent.id, type: 'agent_withdrawal' },
    });

    // Deduct optimistically — reversed if admin declines
    await this.agentRepo.decrement({ id: agent.id }, 'walletBalance', dto.amount);
    return this.payoutRepo.save(payout);
  }

  // ─── Bookings history ────────────────────────────────────────────────────────

  async getBookingHistory(userId: string, query: { page?: number; limit?: number }) {
    const agent = await this.getAgentByUserId(userId);
    const { page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const [data, total] = await this.bookingRepo.findAndCount({
      where: { metadata: { agentId: agent.id } as any },
      skip,
      take: limit,
      relations: ['trip', 'passenger', 'passenger.user'],
      order: { createdAt: 'DESC' },
    });

    return { data, meta: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private async getAgentByUserId(id: string): Promise<Agent> {
    const agent = await this.agentRepo.findOne({ where: { id } });
    if (!agent) throw new NotFoundException('Agent profile not found');
    return agent;
  }

  private async applyCouponDiscount(couponCode: string | undefined): Promise<number> {
    if (!couponCode) return 0;
    // Delegate to coupon service if available — simplified inline for now
    return 0;
  }
}
