import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';

import { Coupon } from '@modules/core/entities/coupon.entity';
import { User } from '@modules/core/entities/user.entity';
import { CouponStatus, CouponType } from '../../../types/enums';
import { RandomnessUtil } from '@shared/utils/encryption/randomness.util';
import { EmailService } from '@modules/email/email.service';
import { Referral } from '@modules/core/entities/referal.entity';
import { ReferralConfig } from '@modules/core/entities/referalconfig.entity';

@Injectable()
export class ReferralService {
  private readonly logger = new Logger(ReferralService.name);

  constructor(
    @InjectRepository(Referral)
    private readonly referralRepo: Repository<Referral>,
    @InjectRepository(ReferralConfig)
    private readonly configRepo: Repository<ReferralConfig>,
    @InjectRepository(Coupon)
    private readonly couponRepo: Repository<Coupon>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly randomnessUtil: RandomnessUtil,
    private readonly emailService: EmailService,
  ) {}

  // ─── Called at registration when referralCode is supplied ────────────────

  /**
   * Records the referral relationship between referrer and new registrant.
   * Call this AFTER the new user record is saved.
   */
  async recordReferral(
    referredUserId: string,
    referralCode: string,
    entityManager?: EntityManager,
  ): Promise<void> {
    const manager = entityManager ?? this.referralRepo.manager;

    // Find the referrer by their unique referral code
    const referrer = await this.userRepo.findOne({ where: { referralCode } });
    if (!referrer) {
      this.logger.warn(`Referral code ${referralCode} not found — skipping`);
      return;
    }

    // Prevent self-referral
    if (referrer.id === referredUserId) {
      this.logger.warn(`User ${referredUserId} tried to self-refer — skipping`);
      return;
    }

    // Prevent duplicate referral records
    const existing = await this.referralRepo.findOne({ where: { referredUserId } });
    if (existing) return;

    await manager.save(Referral, {
      referrerId: referrer.id,
      referredUserId,
      isQualified: false,
    });

    this.logger.log(`Referral recorded: ${referrer.id} → ${referredUserId}`);
  }

  // ─── Called when a referred user completes their FIRST booking ────────────

  /**
   * Marks the referral as qualified and checks if the referrer has hit
   * the milestone. If so, issues a reward coupon to the referrer.
   */
  async qualifyReferral(
    referredUserId: string,
    entityManager?: EntityManager,
  ): Promise<void> {
    const manager = entityManager ?? this.referralRepo.manager;

    const referral = await this.referralRepo.findOne({
      where: { referredUserId, isQualified: false },
    });
    if (!referral) return; // user was not referred, or already qualified

    // Mark qualified
    referral.isQualified = true;
    referral.qualifiedAt = new Date();
    await manager.save(Referral, referral);

    this.logger.log(
      `Referral qualified: referred user ${referredUserId} — referrer ${referral.referrerId}`,
    );

    // Check milestone
    await this.checkAndRewardReferrer(referral.referrerId, manager);
  }

  // ─── Milestone check ──────────────────────────────────────────────────────

  private async checkAndRewardReferrer(
    referrerId: string,
    manager: EntityManager,
  ): Promise<void> {
    const config = await this.getConfig();
    if (!config.isEnabled) return;

    const qualifiedCount = await this.referralRepo.count({
      where: { referrerId, isQualified: true },
    });

    // Reward on every N-th milestone (5, 10, 15, …)
    if (qualifiedCount % config.referralsRequired !== 0) return;

    const referrer = await this.userRepo.findOne({ where: { id: referrerId } });
    if (!referrer) return;

    // Issue reward coupon
    const coupon = await this.issueReferralRewardCoupon(referrer, config, manager);

    // Send email
    await this.emailService.sendReferralReward({
      to: referrer.email,
      firstName: referrer.firstName,
      couponCode: coupon.code,
      rewardValue: Number(config.rewardValue),
      rewardType: config.rewardType,
      expiresAt: coupon.expiresAt,
      qualifiedCount,
    });

    this.logger.log(
      `Referral milestone ${qualifiedCount} reached — coupon ${coupon.code} issued to ${referrer.email}`,
    );
  }

  private async issueReferralRewardCoupon(
  referrer: User,
  config: ReferralConfig,
  manager: EntityManager,
): Promise<Coupon> {
  const code = `REF-${this.randomnessUtil.generateRandomStringWithNumbers(8)}`;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + config.couponValidityDays);

  const coupon = manager.create(Coupon, {
    code,
    userId: referrer.id, // <-- actually link the coupon to the referrer
    type: config.rewardType === 'percentage' ? CouponType.PERCENTAGE : CouponType.REFERRAL,
    status: CouponStatus.ACTIVE,
    value: config.rewardValue,
    maxDiscount: config.maxDiscount ?? null,
    isActive: true,
    isWelcomeCoupon: false,
    usageLimit: 1,
    usageCount: 0,
    expiresAt,
    description: `Referral reward — ${config.referralsRequired} successful referrals`,
  });

  return manager.save(Coupon, coupon);
}
  // private async issueReferralRewardCoupon(
  //   referrer: User,
  //   config: ReferralConfig,
  //   manager: EntityManager,
  // ): Promise<Coupon> {
  //   const code = `REF-${this.randomnessUtil.generateRandomStringWithNumbers(8)}`;
  //   const expiresAt = new Date();
  //   expiresAt.setDate(expiresAt.getDate() + config.couponValidityDays);

  //   const coupon = manager.create(Coupon, {
  //     code,
  //     type: config.rewardType === 'percentage' ? CouponType.PERCENTAGE : CouponType.REFERRAL,
  //     status: CouponStatus.ACTIVE,
  //     value: config.rewardValue,
  //     maxDiscount: config.maxDiscount ?? null,
  //     isActive: true,
  //     isWelcomeCoupon: false,
  //     usageLimit: 1,
  //     usageCount: 0,
  //     expiresAt,
  //     description: `Referral reward — ${config.referralsRequired} successful referrals`,
  //     // Restrict to this referrer via metadata field workaround:
  //     // We store referrerId in description for now; a proper
  //     // user-restricted coupon column can be added in a migration.
  //   });

  //   return manager.save(Coupon, coupon);
  // }

  // ─── Referral stats ───────────────────────────────────────────────────────

  async getReferralStats(userId: string) {
    const config = await this.getConfig();

    const [total, qualified] = await Promise.all([
      this.referralRepo.count({ where: { referrerId: userId } }),
      this.referralRepo.count({ where: { referrerId: userId, isQualified: true } }),
    ]);

    const nextMilestone =
      Math.ceil((qualified + 1) / config.referralsRequired) * config.referralsRequired;
    const remainingForReward = nextMilestone - qualified;

    return {
      totalReferrals: total,
      qualifiedReferrals: qualified,
      pendingReferrals: total - qualified,
      nextMilestone,
      remainingForReward,
      rewardValue: config.rewardValue,
      rewardType: config.rewardType,
      referralsRequired: config.referralsRequired,
    };
  }

  async getReferralList(
    userId: string,
    query: { page?: number; limit?: number },
  ) {
    const { page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const [data, total] = await this.referralRepo.findAndCount({
      where: { referrerId: userId },
      relations: ['referredUser'],
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });
    const referrer = await this.userRepo.findOne({ where: { id: userId } });
     const coupons = data.filter((r) => r.isQualified).length;

      return {
    referral_code: referrer?.referralCode ?? '',
    friends: total,
    coupons,
    referred_user: data.map((r) => ({
      created_at: r.createdAt.toISOString(),
      earned: 0, // no source field on Referral entity yet
      referred: {
        email: r.referredUser?.email ?? '',
        first_name: r.referredUser?.firstName ?? '',
        last_name: r.referredUser?.lastName ?? '',
        profile_picture: r.referredUser?.profileImage ?? '',
      },
      status: r.isQualified ? 'qualified' : 'pending',
      used: 0, // no source field on Referral entity yet
    })),
    meta: { page, limit, total, pages: Math.ceil(total / limit) },
  };

    //return { data, meta: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

async getReferralCuponType(
  userId: string,
  query: { page?: number; limit?: number; type?: 'all' | 'used' | 'expired' },
) {
  const { page = 1, limit = 20, type = 'all' } = query;
  const skip = (page - 1) * limit;

  const qb = this.couponRepo
    .createQueryBuilder('coupon')
    .where('coupon.userId = :userId', { userId });

  const now = new Date();

  if (type === 'used') {
    qb.andWhere('coupon.usageCount > 0');
  } else if (type === 'expired') {
    qb.andWhere('coupon.expiresAt < :now', { now })
      .andWhere('coupon.usageCount = 0'); // expired but never used
  }
  // 'all' → no extra filter

  const [data, total] = await qb
    .orderBy('coupon.createdAt', 'DESC')
    .skip(skip)
    .take(limit)
    .getManyAndCount();

  return {
    coupons: data.map((c) => ({
      code: c.code,
      type: c.type,
      value: c.value,
      status: c.usageCount > 0 ? 'used' : c.expiresAt < now ? 'expired' : 'active',
      expires_at: c.expiresAt.toISOString(),
      used: c.usageCount > 0,
    })),
    meta: { page, limit, total, pages: Math.ceil(total / limit) },
  };
}

  // ─── Config helpers ───────────────────────────────────────────────────────

  async getConfig(): Promise<ReferralConfig> {
    let config = await this.configRepo.findOne({ where: {} });
    if (!config) {
      config = await this.configRepo.save(
        this.configRepo.create({
          referralsRequired: 5,
          rewardType: 'flat',
          rewardValue: 500,
          couponValidityDays: 30,
          isEnabled: true,
        }),
      );
    }
    return config;
  }

  async updateConfig(dto: Partial<ReferralConfig>): Promise<ReferralConfig> {
    const config = await this.getConfig();
    Object.assign(config, dto);
    return this.configRepo.save(config);
  }
}