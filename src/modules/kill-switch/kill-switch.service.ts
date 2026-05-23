import {
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { KillSwitch } from '../core/entities/kill-switch.entity';

@Injectable()
export class KillSwitchService implements OnModuleInit {
  private readonly logger = new Logger(KillSwitchService.name);
  /** In-memory cache — avoids a DB hit on every request */
  private cachedState: boolean = false;
  private cacheExpiry: number = 0;
  private readonly CACHE_TTL_MS = 5_000; // 5 seconds

  constructor(
    @InjectRepository(KillSwitch)
    private readonly repo: Repository<KillSwitch>,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    await this.ensureRecord();
    this.cachedState = await this.fetchFromDb();
    this.logger.log(`Kill switch initialised — active: ${this.cachedState}`);
  }

  /** Used by the guard on every request. Cached for 5 s. */
  async isActive(): Promise<boolean> {
    if (Date.now() < this.cacheExpiry) return this.cachedState;
    this.cachedState = await this.fetchFromDb();
    this.cacheExpiry = Date.now() + this.CACHE_TTL_MS;
    return this.cachedState;
  }

  async activate(
    adminEmail: string,
    deactivationCode: string,
    reason?: string,
  ): Promise<KillSwitch> {
    this.verifyDeactivationCode(deactivationCode);

    const record = await this.getRecord();
    if (record.isActive) throw new ServiceUnavailableException('Kill switch already active');

    const now = new Date();
    record.isActive = true;
    record.reason = reason ?? 'Emergency shutdown';
    record.activatedBy = adminEmail;
    record.activatedAt = now;
    record.deactivatedBy = null;
    record.deactivatedAt = null;
    record.auditLog = [
      ...(record.auditLog ?? []),
      { action: 'activated', actor: adminEmail, reason, timestamp: now.toISOString() },
    ];

    await this.repo.save(record);
    this.cachedState = true;
    this.cacheExpiry = 0; // Force refresh next cycle
    this.logger.warn(`Kill switch ACTIVATED by ${adminEmail} — reason: ${reason}`);
    return record;
  }

  async deactivate(
    adminEmail: string,
    deactivationCode: string,
    twoFaCode?: string,
  ): Promise<KillSwitch> {
    this.verifyDeactivationCode(deactivationCode);
    this.verify2faCode(twoFaCode);

    const record = await this.getRecord();
    if (!record.isActive) throw new ServiceUnavailableException('Kill switch is not active');

    const now = new Date();
    record.isActive = false;
    record.deactivatedBy = adminEmail;
    record.deactivatedAt = now;
    record.auditLog = [
      ...(record.auditLog ?? []),
      { action: 'deactivated', actor: adminEmail, timestamp: now.toISOString() },
    ];

    await this.repo.save(record);
    this.cachedState = false;
    this.cacheExpiry = 0;
    this.logger.log(`Kill switch DEACTIVATED by ${adminEmail}`);
    return record;
  }

  async getStatus(): Promise<KillSwitch> {
    return this.getRecord();
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private verifyDeactivationCode(code: string) {
    const expected = this.configService.get<string>('common.killSwitch.deactivationCode');
    if (!expected || code !== expected) {
      throw new UnauthorizedException('Invalid deactivation code');
    }
  }

  private verify2faCode(code?: string) {
    const expected = this.configService.get<string>('common.killSwitch.twoFaApprovalCode');
    if (!expected) return; // 2FA not configured — skip
    if (code !== expected) throw new UnauthorizedException('Invalid 2FA approval code');
  }

  private async fetchFromDb(): Promise<boolean> {
    const record = await this.repo.findOne({ where: {} });
    return record?.isActive ?? false;
  }

  private async getRecord(): Promise<KillSwitch> {
    const record = await this.repo.findOne({ where: {} });
    if (!record) return this.repo.save(this.repo.create({ isActive: false, auditLog: [] }));
    return record;
  }

  private async ensureRecord(): Promise<void> {
    const count = await this.repo.count();
    if (count === 0) {
      await this.repo.save(this.repo.create({ isActive: false, auditLog: [] }));
    }
  }
}
