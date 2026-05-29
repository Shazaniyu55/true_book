import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { Coupon } from '@modules/core/entities/coupon.entity';
import { User } from '@modules/core/entities/user.entity';
import { CouponStatus, CouponType } from '../../../types/enums';
import { EmailService } from '@modules/email/email.service';
import {
  CreateCouponDto,
  ToggleWelcomeCouponDto,
  UpdateCouponDto,
  ValidateCouponDto,
} from '../dtos/cupon.dto';

@Injectable()
export class CouponService {
  private readonly logger = new Logger(CouponService.name);

  constructor(
    @InjectRepository(Coupon)
    private readonly couponRepo: Repository<Coupon>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly emailService: EmailService,
  ) {}

  // ─── Admin: create coupon ─────────────────────────────────────────────────

  async createCoupon(dto: CreateCouponDto, adminId: string): Promise<Coupon> {
    const existing = await this.couponRepo.findOne({
      where: { code: dto.code.toUpperCase() },
    });
    if (existing) throw new BadRequestException('Coupon code already exists');

    const coupon = this.couponRepo.create({
      code: dto.code.toUpperCase(),
      type: dto.type,
      value: dto.value,
      maxDiscount: dto.maxDiscount ?? null,
      minOrderAmount: dto.minOrderAmount ?? null,
      usageLimit: dto.usageLimit ?? null,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      startsAt: dto.startsAt ? new Date(dto.startsAt) : new Date(),
      status: CouponStatus.ACTIVE,
      isActive: true,
      isWelcomeCoupon: false,
      description: dto.description ?? null,
      createdByAdminId: adminId,
    });

    return this.couponRepo.save(coupon);
  }

  // ─── Admin: update coupon ─────────────────────────────────────────────────

  async updateCoupon(id: string, dto: UpdateCouponDto): Promise<Coupon> {
    const coupon = await this.couponRepo.findOne({ where: { id } });
    if (!coupon) throw new NotFoundException('Coupon not found');

    if (dto.code) {
      const conflict = await this.couponRepo.findOne({
        where: { code: dto.code.toUpperCase() },
      });
      if (conflict && conflict.id !== id)
        throw new BadRequestException('Coupon code already taken');
      dto.code = dto.code.toUpperCase();
    }

    Object.assign(coupon, {
      ...dto,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : coupon.expiresAt,
      startsAt: dto.startsAt ? new Date(dto.startsAt) : coupon.startsAt,
    });

    return this.couponRepo.save(coupon);
  }

  // ─── Admin: toggle coupon active/inactive ─────────────────────────────────

  async toggleCoupon(id: string): Promise<Coupon> {
    const coupon = await this.couponRepo.findOne({ where: { id } });
    if (!coupon) throw new NotFoundException('Coupon not found');

    coupon.isActive = !coupon.isActive;
    coupon.status = coupon.isActive ? CouponStatus.ACTIVE : CouponStatus.INACTIVE;
    return this.couponRepo.save(coupon);
  }

  async deactivateCoupon(id: string): Promise<Coupon> {
    const coupon = await this.couponRepo.findOne({ where: { id } });
    if (!coupon) throw new NotFoundException('Coupon not found');
    coupon.isActive = false;
    coupon.status = CouponStatus.INACTIVE;
    return this.couponRepo.save(coupon);
  }

  // ─── Admin: toggle welcome coupon ─────────────────────────────────────────

  /**
   * Creates or updates the WELCOME coupon.
   * When isActive=true, new passengers who register will automatically receive
   * this coupon code by email.
   *
   * Only ONE welcome coupon can be active at a time.
   */
  async toggleWelcomeCoupon(dto: ToggleWelcomeCouponDto, adminId: string): Promise<Coupon> {
    // Deactivate any existing active welcome coupon first
    await this.couponRepo.update(
      { isWelcomeCoupon: true, isActive: true },
      { isActive: false, status: CouponStatus.INACTIVE },
    );

    if (!dto.activate) {
      return this.getActiveWelcomeCoupon(); // returns null-like; already deactivated
    }

    // Create a new welcome coupon
    const code = dto.code?.toUpperCase() ?? `WELCOME-${new Date().getFullYear()}`;

    const existing = await this.couponRepo.findOne({ where: { code } });
    if (existing) {
      // Re-activate it
      existing.isActive = true;
      existing.status = CouponStatus.ACTIVE;
      existing.value = dto.value ?? existing.value;
      existing.type = dto.type ?? existing.type;
      existing.expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : existing.expiresAt;
      existing.startsAt = new Date();
      existing.isWelcomeCoupon = true;
      existing.description = dto.description ?? existing.description;
      return this.couponRepo.save(existing);
    }

    const coupon = this.couponRepo.create({
      code,
      type: dto.type ?? CouponType.PERCENTAGE,
      value: dto.value ?? 10,
      maxDiscount: dto.maxDiscount ?? null,
      minOrderAmount: dto.minOrderAmount ?? null,
      usageLimit: 1, // one-time per passenger
      usageCount: 0,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      startsAt: new Date(),
      status: CouponStatus.ACTIVE,
      isActive: true,
      isWelcomeCoupon: true,
      description: dto.description ?? 'Welcome discount for new passengers',
      createdByAdminId: adminId,
    });

    return this.couponRepo.save(coupon);
  }

  // ─── Called at passenger registration ────────────────────────────────────

  /**
   * If an active welcome coupon exists when a passenger registers,
   * send them the coupon code by email.
   */
  async dispatchWelcomeCouponIfActive(user: User): Promise<void> {
    const welcomeCoupon = await this.getActiveWelcomeCoupon();
    if (!welcomeCoupon) return;

    try {
      await this.emailService.sendWelcomeCoupon({
        to: user.email,
        firstName: user.firstName,
        couponCode: welcomeCoupon.code,
        discountValue: Number(welcomeCoupon.value),
        discountType: welcomeCoupon.type,
        expiresAt: welcomeCoupon.expiresAt,
        description: welcomeCoupon.description,
      });
      this.logger.log(`Welcome coupon ${welcomeCoupon.code} dispatched to ${user.email}`);
    } catch (err) {
      // Never crash registration because of a coupon email failure
      this.logger.error(`Failed to send welcome coupon to ${user.email}`, err?.message);
    }
  }

  // ─── Passenger: validate / apply coupon ──────────────────────────────────

  async validateCoupon(
    dto: ValidateCouponDto,
  ): Promise<{ valid: boolean; discount: number; coupon?: Coupon; message: string }> {
    const coupon = await this.couponRepo.findOne({
      where: { code: dto.code.toUpperCase(), isActive: true },
    });

    if (!coupon) return { valid: false, discount: 0, message: 'Coupon not found or inactive' };

    const now = new Date();
    if (coupon.startsAt && now < new Date(coupon.startsAt))
      return { valid: false, discount: 0, message: 'Coupon is not yet active' };

    if (coupon.expiresAt && now > new Date(coupon.expiresAt))
      return { valid: false, discount: 0, message: 'Coupon has expired' };

    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit)
      return { valid: false, discount: 0, message: 'Coupon usage limit reached' };

    if (coupon.minOrderAmount && dto.subtotal < Number(coupon.minOrderAmount))
      return {
        valid: false,
        discount: 0,
        message: `Minimum order amount is NGN ${coupon.minOrderAmount}`,
      };

    let discount =
      coupon.type === CouponType.PERCENTAGE
        ? (dto.subtotal * Number(coupon.value)) / 100
        : Number(coupon.value);

    if (coupon.maxDiscount) discount = Math.min(discount, Number(coupon.maxDiscount));
    discount = Math.min(discount, dto.subtotal);

    return {
      valid: true,
      discount,
      coupon,
      message: `Coupon applied — NGN ${discount.toFixed(2)} discount`,
    };
  }

  // ─── List / get ───────────────────────────────────────────────────────────

  async listCoupons(query: {
    page?: number;
    limit?: number;
    type?: CouponType;
    isActive?: boolean;
  }) {
    const { page = 1, limit = 20, type, isActive } = query;
    const skip = (page - 1) * limit;

    const qb = this.couponRepo
      .createQueryBuilder('c')
      .skip(skip)
      .take(limit)
      .orderBy('c.createdAt', 'DESC');

    if (type !== undefined) qb.andWhere('c.type = :type', { type });
    if (isActive !== undefined) qb.andWhere('c.isActive = :isActive', { isActive });

    const [data, total] = await qb.getManyAndCount();
    return { data, meta: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  async getCouponById(id: string): Promise<Coupon> {
    const coupon = await this.couponRepo.findOne({ where: { id } });
    if (!coupon) throw new NotFoundException('Coupon not found');
    return coupon;
  }

  async getActiveWelcomeCoupon(): Promise<Coupon | null> {
    return this.couponRepo.findOne({
      where: { isWelcomeCoupon: true, isActive: true },
    });
  }

  // ─── Internal: apply coupon (used in booking flow) ────────────────────────

  async applyCoupon(
    code: string | undefined,
    subtotal: number,
    manager?: EntityManager,
  ): Promise<{ discountAmount: number; couponId?: string }> {
    if (!code) return { discountAmount: 0 };

    const repo = manager ? manager.getRepository(Coupon) : this.couponRepo;
    const coupon = await repo.findOne({
      where: { code: code.toUpperCase(), isActive: true },
    });
    if (!coupon) return { discountAmount: 0 };

    const now = new Date();
    if (coupon.expiresAt && now > new Date(coupon.expiresAt)) return { discountAmount: 0 };
    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) return { discountAmount: 0 };
    if (coupon.minOrderAmount && subtotal < Number(coupon.minOrderAmount))
      return { discountAmount: 0 };

    let discountAmount =
      coupon.type === CouponType.PERCENTAGE
        ? (subtotal * Number(coupon.value)) / 100
        : Number(coupon.value);

    if (coupon.maxDiscount) discountAmount = Math.min(discountAmount, Number(coupon.maxDiscount));
    discountAmount = Math.min(discountAmount, subtotal);

    return { discountAmount, couponId: coupon.id };
  }
}