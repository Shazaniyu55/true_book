import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppVersionHistory } from '@modules/core/entities/appversion.entity';
import { PagedDto } from '@shared/interface/paged.interface';
import { UpdateAppVersionDto, VersionHistoryQueryDto } from '../dto/app-version.dto';

@Injectable()
export class AppVersionService {
  private readonly logger = new Logger(AppVersionService.name);

  constructor(
    @InjectRepository(AppVersionHistory)
    private readonly repo: Repository<AppVersionHistory>,
  ) {}

  async checkVersion(
    appType: 'passenger' | 'driver',
    platform = 'android',
    fallbackVersion = '1.0.0',
  ) {
    // Mirrors the driver controller's explicit platform validation
    if (!['android', 'ios'].includes(platform)) {
      throw new BadRequestException('Invalid platform');
    }

    try {
      const settings = await this.repo.findOne({ where: { appType, platform } });

      if (!settings) {
        this.logger.warn(`${appType} version settings not found for ${platform} — using defaults`);
        return { minVersion: fallbackVersion, latestVersion: fallbackVersion, isForceUpdate: false, updateMessage: null };
      }

      // Disabled → minVersion '0.0.0' never triggers an update
      if (!settings.isEnabled) {
        return { minVersion: '0.0.0', latestVersion: settings.latestVersion, isForceUpdate: false, updateMessage: null };
      }

      return {
        minVersion: settings.minVersion,
        latestVersion: settings.latestVersion,
        isForceUpdate: Boolean(settings.isForceUpdate),
        updateMessage: settings.updateMessage,
      };
    } catch (err) {
      if (err instanceof BadRequestException) throw err; // keep the 400
      this.logger.error(`${appType} version check failed: ${err?.message}`);
      // Safe defaults on unexpected error, like the Laravel catch block
      return { minVersion: fallbackVersion, latestVersion: fallbackVersion, isForceUpdate: false, updateMessage: null };
    }
  }

  // ─── Admin: current effective settings (latest row per appType × platform) ──
async getCurrentSettings() {
  const all = await this.repo.find({ order: { createdAt: 'DESC' } });
  const seen = new Set<string>();
  const current = [];
  for (const row of all) {
    const key = `${row.appType}:${row.platform}`;
    if (!seen.has(key)) {
      seen.add(key);
      current.push(row);
    }
  }
  return current;
}

// ─── Admin: create a new version record (append → becomes new "current") ────
async updateSettings(dto: UpdateAppVersionDto, adminEmail?: string) {
  const row = this.repo.create({
    appType: dto.appType,
    platform: dto.platform,
    minVersion: dto.minVersion,
    latestVersion: dto.latestVersion,
    isForceUpdate: dto.isForceUpdate ?? false,
    isEnabled: dto.isEnabled ?? true,
    updateMessage: dto.updateMessage ?? null,
    createdBy: adminEmail ?? null,
  });
  return this.repo.save(row);
}

// ─── Admin: paginated history ───────────────────────────────────────────────
async getHistory(query: VersionHistoryQueryDto): Promise<PagedDto<any>> {
  const { page = 1, limit = 20, appType, platform } = query;
  const skip = (page - 1) * limit;

  const where: any = {};
  if (appType) where.appType = appType;
  if (platform) where.platform = platform;

  const [data, total] = await this.repo.findAndCount({
    where,
    skip,
    take: limit,
    order: { createdAt: 'DESC' },
  });

  const paged = new PagedDto();
  paged.data = data;
  paged.meta = {
    page, limit,
    count: data.length,
    previousPage: page > 1 ? page - 1 : false,
    nextPage: skip + limit < total ? page + 1 : false,
    pageCount: Math.ceil(total / limit),
    totalRecords: total,
  };
  return paged;
}
}