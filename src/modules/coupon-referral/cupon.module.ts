import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Coupon } from '@modules/core/entities/coupon.entity';
import { User } from '@modules/core/entities/user.entity';
import { RandomnessUtil } from '@shared/utils/encryption/randomness.util';
import { Referral } from '@modules/core/entities/referal.entity';
import { ReferralConfig } from '@modules/core/entities/referalconfig.entity';
import { CouponController } from './controller/cupon.controller';
import { ReferralController } from './controller/referal.controller';
import { CouponService } from './service/cupon.service';
import { ReferralService } from './service/referal.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Coupon, Referral, ReferralConfig, User]),
  ],
  controllers: [CouponController, ReferralController],
  providers: [CouponService, ReferralService, RandomnessUtil],
  exports: [CouponService, ReferralService],
})
export class CouponReferralModule {}