// system-setting.service.ts
import { SystemSetting } from '@modules/core/entities/system-setting.entity';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PriceControlDto, ReferralProgramDto, SystemSettingEnum } from 'src/types/enums';
import { Repository } from 'typeorm';
import { RedisCacheService } from '@modules/cache/redis-cache.service';
import { CACHE_TTL } from '@modules/cache/redis-cache.constants';


@Injectable()
export class SystemSettingService {
  constructor(
    @InjectRepository(SystemSetting)
    private readonly settingRepo: Repository<SystemSetting>,
    private readonly cache: RedisCacheService
  ) {}
  private readonly PRICE_KEY = 'system:price_control';
  private readonly REFERRAL_KEY = 'system:referral_program';

  // ─── Get All Settings ────────────────────────────────────────────────────────

  async getAllSettings() {
    return this.settingRepo.find({ order: { createdAt: 'ASC' } });
  }

  async getSettingByKey(key: SystemSettingEnum) {
    const setting = await this.settingRepo.findOne({ where: { key } });
    if (!setting) throw new NotFoundException(`Setting "${key}" not found`);
    return setting;
  }

  // ─── Price Control ───────────────────────────────────────────────────────────

async setPriceControl(data: PriceControlDto) {
  const setting = await this.settingRepo.findOne({
    where: { key: SystemSettingEnum.PRICE_CONTROL },
  });
  if (!setting) throw new NotFoundException('Price control setting not found');

  setting.value = { ...setting.value, ...data };
  const saved = await this.settingRepo.save(setting);
  await this.cache.del(this.PRICE_KEY); // ← invalidate
  return saved;
}

async getPriceControl(): Promise<PriceControlDto> {
  return this.cache.getOrSet(
    this.PRICE_KEY,
    async () => {
      const setting = await this.settingRepo.findOne({
        where: { key: SystemSettingEnum.PRICE_CONTROL },
      });
      if (!setting) throw new NotFoundException('Price control setting not found');
      return setting.value as PriceControlDto;
    },
    CACHE_TTL.HOUR,
  );
}

  // ─── Referral Program ────────────────────────────────────────────────────────

async setReferralProgram(data: ReferralProgramDto) {
  const setting = await this.settingRepo.findOne({
    where: { key: SystemSettingEnum.REFERRAL_PROGRAM },
  });
  if (!setting) throw new NotFoundException('Referral program setting not found');

  setting.value = { ...setting.value, ...data };
  const saved = await this.settingRepo.save(setting);
  await this.cache.del(this.REFERRAL_KEY); // ← invalidate
  return saved;
}

async getReferralProgram(): Promise<ReferralProgramDto> {
  return this.cache.getOrSet(
    this.REFERRAL_KEY,
    async () => {
      const setting = await this.settingRepo.findOne({
        where: { key: SystemSettingEnum.REFERRAL_PROGRAM },
      });
      if (!setting) throw new NotFoundException('Referral program setting not found');
      return setting.value as ReferralProgramDto;
    },
    CACHE_TTL.HOUR,
  );
}

  // ─── Seed Default Settings (run once on app bootstrap) ───────────────────────

  async seedDefaults() {
    const defaults = [
      {
        key: SystemSettingEnum.PRICE_CONTROL,
        description: 'Controls platform pricing and commission rates',
        value: {
          agentEarningAmount: 50000,
          platformCommissionRate: 10,
          driverEarningRate: 85,
          minTripPrice: 500,
          maxTripPrice: 100000,
        } as PriceControlDto,
      },
      {
        key: SystemSettingEnum.REFERRAL_PROGRAM,
        description: 'Controls agent referral earning rules',
        value: {
          earningPerTrip: 1000,
          maxEarningPerDriver: 50000,
          referralBonus: 0,
          isActive: true,
        } as ReferralProgramDto,
      },
    ];

    for (const item of defaults) {
      const exists = await this.settingRepo.findOne({ where: { key: item.key } });
      if (!exists) {
        await this.settingRepo.save(this.settingRepo.create(item));
      }
    }
  }
}