import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Agent } from '@modules/core/entities/agent.entity';
import { Driver } from '@modules/core/entities/driver.entity';
import { Trip } from '@modules/core/entities/trip.entity';
import { Booking } from '@modules/core/entities/booking.entity';
import { Payout } from '@modules/core/entities/payout.entity';
import { BookingStatus, TripStatus } from '../../../types/enums';
import { AgentReferral } from '@modules/core/entities/agent-referral.entity';
import { SystemSettingService } from '@modules/system/service/system.service';


@Injectable()
export class AgentService {
  constructor(
    @InjectRepository(Agent) private readonly agentRepo: Repository<Agent>,
    @InjectRepository(Driver) private readonly driverRepo: Repository<Driver>,
    @InjectRepository(Trip) private readonly tripRepo: Repository<Trip>,
    @InjectRepository(Booking) private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(Payout) private readonly payoutRepo: Repository<Payout>,
    @InjectRepository(AgentReferral) private readonly referralRepo: Repository<AgentReferral>,
    private readonly settingService: SystemSettingService
  ) {}

  // ─── Refer a Driver ─────────────────────────────────────────────────────────

  async referDriver(agentId: string, driverId: string, referralCode: string) {
    // Check if driver is already referred
    const existingReferral = await this.referralRepo.findOne({
      where: { driverId },
    });

    if (existingReferral) {
      throw new BadRequestException('Referral already exists for this driver');
    }

    const agent = await this.agentRepo.findOne({
      where: { id: agentId },
      relations: ['user'],
    });
    if (!agent) throw new NotFoundException('Agent not found');

    const driver = await this.driverRepo.findOne({
      where: { id: driverId },
      relations: ['user'],
    });
    if (!driver) throw new NotFoundException('Driver not found');

    const referral = this.referralRepo.create({
      agentId,
      driverId,
      referralCode,
      referredAt: new Date(),
      earnedAmount: 0,
    });

    const saved = await this.referralRepo.save(referral);

    // Increment agent's total referrals count
    await this.agentRepo.increment({ id: agentId }, 'totalReferrals', 1);

    return saved;
  }

  // ─── Agent Dashboard ─────────────────────────────────────────────────────────

  async getDashboard(agentId: string) {
    const agent = await this.agentRepo.findOne({ where: { id: agentId } });
    if (!agent) throw new NotFoundException('Agent not found');

    // Sum earned amount from all referrals
    const earningsResult = await this.referralRepo
      .createQueryBuilder('r')
      .select('SUM(r.earnedAmount)', 'total')
      .where('r.agentId = :agentId', { agentId })
      .getRawOne();

    const totalEarnings = parseFloat(earningsResult?.total ?? '0');

    // Sum of all approved/completed payouts for this agent
    const withdrawnResult = await this.payoutRepo
      .createQueryBuilder('p')
      .select('SUM(p.amount)', 'total')
      .where('p.agentId = :agentId', { agentId })
      .andWhere('p.status = :status', { status: 'approved' })
      .getRawOne();

    const amountWithdrawn = parseFloat(withdrawnResult?.total ?? '0');
    const balance = totalEarnings - amountWithdrawn;

    return {
      total_earnings: totalEarnings,
      total_referrals: agent.totalReferrals,
      amount_withdrawn: amountWithdrawn,
      balance: Number(agent.currentBalance), //  use stored balance column
    };
  }

  // ─── Fetch Referred Drivers ──────────────────────────────────────────────────

  async getDriversReferred(agentId: string, query: { page?: number; limit?: number }) {
    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const agent = await this.agentRepo.findOne({ where: { id: agentId } });
    if (!agent) throw new NotFoundException('Agent not found');

    const [referrals, total] = await this.referralRepo.findAndCount({
      where: { agentId },
      relations: ['driver.user'],
      skip,
      take: limit,
      order: { referredAt: 'DESC' },
    });

    const data = referrals.map((r) => ({
      driver: r.driver?.user
        ? `${r.driver.user.firstName} ${r.driver.user.lastName}`
        : 'Unknown',
      email: r.driver?.user?.email,
      phone: r.driver?.user?.phone,
      referred_at: r.referredAt,
      earned_amount: Number(r.earnedAmount ?? 0),
      referral_code: r.referralCode,
    }));

    return {
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

  // ─── Earn From Driver's Completed Trip ───────────────────────────────────────

  async earnFromDriversTrip(tripId: string) {
  const trip = await this.tripRepo.findOne({
    where: { id: tripId },
    relations: ['driver.user'],
  });
  if (!trip) return;

  const driver = trip.driver;
  if (!driver) return;

  // Check if trip has at least one completed booking
  const completedBookings = await this.bookingRepo.count({
    where: {
      tripId: trip.id,
      status: BookingStatus.COMPLETED,
    },
  });
  if (completedBookings < 1) return;

  const referralSettings = await this.settingService.getReferralProgram();

  if (!referralSettings.isActive) return;

  const MAX_AGENT_EARNING = referralSettings.maxEarningPerDriver;
  const EARNING_PER_TRIP = referralSettings.earningPerTrip;

  // Find referral for this driver
  const referral = await this.referralRepo.findOne({
    where: { driverId: driver.id },
    relations: ['agent'],
  });
  if (!referral) return;

  const currentEarned = Number(referral.earnedAmount);

  if (currentEarned >= MAX_AGENT_EARNING) return;

  const remaining = MAX_AGENT_EARNING - currentEarned;
  const increment = Math.min(EARNING_PER_TRIP, remaining);
  if (increment <= 0) return;

  // Update referral earned amount
  await this.referralRepo.increment({ id: referral.id }, 'earnedAmount', increment);

  // Credit agent wallet
  await this.agentRepo.increment({ id: referral.agentId }, 'currentBalance', increment);
  await this.agentRepo.increment({ id: referral.agentId }, 'totalCommission', increment);

  return {
    agentId: referral.agentId,
    driverId: driver.id,
    increment,
    newEarnedAmount: currentEarned + increment,
    capRemaining: remaining - increment,
  };
}
}


