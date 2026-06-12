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
import { RedisCacheService } from '@modules/cache/redis-cache.service';
import { CACHE_KEYS, CACHE_TTL } from '@modules/cache/redis-cache.constants';

/**
 * KillSwitchService
 *
 * Two levels of kill switch:
 * 1. GLOBAL — takes the entire API offline (killedServices is empty).
 * 2. SERVICE-LEVEL — kills individual named services (e.g. "auth", "trips", "payments").
 *
 * Service names come from the @ServiceName('name') decorator placed on controllers.
 * The guard reads the name and checks it against killedServices[].
 */
@Injectable()
export class KillSwitchService implements OnModuleInit {
  private readonly logger = new Logger(KillSwitchService.name);

  private cachedRecord: KillSwitch | null = null;
  private cacheExpiry: number = 0;
  private readonly CACHE_TTL_MS = 5_000; // 5 seconds

  constructor(
    @InjectRepository(KillSwitch)
    private readonly repo: Repository<KillSwitch>,
    private readonly configService: ConfigService,
    private readonly cache: RedisCacheService
  ) {}

  async onModuleInit() {
    await this.ensureRecord();
    this.cachedRecord = await this.fetchFromDb();
    this.logger.log(
      `Kill switch ready — global active: ${this.cachedRecord?.isActive}, ` +
      `killed services: [${this.cachedRecord?.killedServices?.join(', ') ?? ''}]`,
    );
  }

  // ─── Status & cache ────────────────────────────────────────────────────────

  async isActive(): Promise<boolean> {
    const record = await this.getCachedRecord();
    return record?.isActive ?? false;
  }

  async isServiceKilled(serviceName: string): Promise<boolean> {
    const record = await this.getCachedRecord();
    if (!record) return false;
    // Global kill → everything is down
    if (record.isActive && (!record.killedServices?.length)) return true;
    // Service-level kill
    return record.killedServices?.includes(serviceName) ?? false;
  }

  async getStatus(): Promise<KillSwitch> {
    return this.getRecord();
  }

  // ─── GLOBAL kill switch ────────────────────────────────────────────────────

  async activate(
    adminEmail: string,
    deactivationCode: string,
    reason?: string,
  ): Promise<KillSwitch> {
    this.verifyDeactivationCode(deactivationCode);

    const record = await this.getRecord();
    if (record.isActive && !record.killedServices?.length)
      throw new ServiceUnavailableException('Global kill switch already active');

    const now = new Date();
    record.isActive = true;
    record.killedServices = []; // empty = full API down
    record.reason = reason ?? 'Emergency global shutdown';
    record.activatedBy = adminEmail;
    record.activatedAt = now;
    record.deactivatedBy = null;
    record.deactivatedAt = null;
    record.auditLog = [
      ...(record.auditLog ?? []),
      { action: 'activated', actor: adminEmail, reason, timestamp: now.toISOString() },
    ];

    await this.repo.save(record);
    this.invalidateCache();
    this.logger.warn(`🔴 Global kill switch ACTIVATED by ${adminEmail} — reason: ${reason}`);
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
    if (!record.isActive)
      throw new ServiceUnavailableException('Kill switch is not active');

    const now = new Date();
    record.isActive = false;
    record.killedServices = [];
    record.deactivatedBy = adminEmail;
    record.deactivatedAt = now;
    record.auditLog = [
      ...(record.auditLog ?? []),
      { action: 'deactivated', actor: adminEmail, timestamp: now.toISOString() },
    ];

    await this.repo.save(record);
    this.invalidateCache();
    this.logger.log(`🟢 Global kill switch DEACTIVATED by ${adminEmail}`);
    return record;
  }

  // ─── SERVICE-LEVEL kill switch ─────────────────────────────────────────────

  /**
   * Kill a specific service (e.g. "auth", "trips", "payments").
   * Does NOT set isActive=true on its own — service-level kills work independently.
   */
  async killService(
    serviceName: string,
    adminEmail: string,
    deactivationCode: string,
    reason?: string,
  ): Promise<KillSwitch> {
    this.verifyDeactivationCode(deactivationCode);

    const record = await this.getRecord();
    const services = new Set(record.killedServices ?? []);

    if (services.has(serviceName))
      throw new ServiceUnavailableException(`Service "${serviceName}" is already killed`);

    services.add(serviceName);
    const now = new Date();
    record.killedServices = Array.from(services);
    record.auditLog = [
      ...(record.auditLog ?? []),
      {
        action: 'activated' as const,
        actor: adminEmail,
        reason: reason ?? `Service-level kill: ${serviceName}`,
        timestamp: now.toISOString(),
        service: serviceName,
      } as any,
    ];

    await this.repo.save(record);
    this.invalidateCache();
    this.logger.warn(`🔴 Service "${serviceName}" killed by ${adminEmail}`);
    return record;
  }

  /**
   * Restore a previously killed service.
   */
  async restoreService(
    serviceName: string,
    adminEmail: string,
    deactivationCode: string,
  ): Promise<KillSwitch> {
    this.verifyDeactivationCode(deactivationCode);

    const record = await this.getRecord();
    const services = new Set(record.killedServices ?? []);

    if (!services.has(serviceName))
      throw new ServiceUnavailableException(`Service "${serviceName}" is not currently killed`);

    services.delete(serviceName);
    const now = new Date();
    record.killedServices = Array.from(services);
    record.auditLog = [
      ...(record.auditLog ?? []),
      {
        action: 'deactivated' as const,
        actor: adminEmail,
        timestamp: now.toISOString(),
        service: serviceName,
      } as any,
    ];

    await this.repo.save(record);
    this.invalidateCache();
    this.logger.log(`🟢 Service "${serviceName}" restored by ${adminEmail}`);
    return record;
  }

  /**
   * Kill multiple services at once (e.g. ["payments", "booking"]).
   */
  async killMultipleServices(
    serviceNames: string[],
    adminEmail: string,
    deactivationCode: string,
    reason?: string,
  ): Promise<KillSwitch> {
    this.verifyDeactivationCode(deactivationCode);

    const record = await this.getRecord();
    const services = new Set(record.killedServices ?? []);
    serviceNames.forEach((s) => services.add(s));

    const now = new Date();
    record.killedServices = Array.from(services);
    record.auditLog = [
      ...(record.auditLog ?? []),
      {
        action: 'activated' as const,
        actor: adminEmail,
        reason: reason ?? `Bulk kill: [${serviceNames.join(', ')}]`,
        timestamp: now.toISOString(),
        services: serviceNames,
      } as any,
    ];

    await this.repo.save(record);
    this.invalidateCache();
    this.logger.warn(`🔴 Services [${serviceNames.join(', ')}] killed by ${adminEmail}`);
    return record;
  }

  /**
   * Returns a list of all currently known service names + their status.
   * The list of all possible services is known from the @ServiceName decorators.
   */
  getKnownServices(): string[] {
    return [
      'auth',
      'trips',
      'bookings',
      'payments',
      'driver',
      'passenger',
      'admin',
      'agent',
      'notifications',
      'webhooks',
      'contact-support',
    ];
  }

  async getServiceStatuses(): Promise<Record<string, boolean>> {
    const record = await this.getCachedRecord();
    const killed = new Set(record?.killedServices ?? []);
    const globalKilled = record?.isActive && !killed.size;

    return this.getKnownServices().reduce(
      (acc, name) => ({
        ...acc,
        [name]: globalKilled || killed.has(name),
      }),
      {},
    );
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private verifyDeactivationCode(code: string) {
    const expected = this.configService.get<string>('common.killSwitch.deactivationCode');
    if (!expected || code !== expected)
      throw new UnauthorizedException('Invalid deactivation code');
  }

  private verify2faCode(code?: string) {
    const expected = this.configService.get<string>('common.killSwitch.twoFaApprovalCode');
    if (!expected) return;
    if (code !== expected) throw new UnauthorizedException('Invalid 2FA approval code');
  }

 private async getCachedRecord(): Promise<KillSwitch | null> {
  // L1: in-process (per-instance, fastest)
  if (Date.now() < this.cacheExpiry && this.cachedRecord) return this.cachedRecord;

  // L2: Redis (shared across instances)
  let record = await this.cache.get<KillSwitch>(CACHE_KEYS.KILL_SWITCH);

  // L3: database
  if (!record) {
    record = await this.fetchFromDb();
    if (record) {
      await this.cache.set(CACHE_KEYS.KILL_SWITCH, record, CACHE_TTL.SHORT);
    }
  }

  this.cachedRecord = record;
  this.cacheExpiry = Date.now() + this.CACHE_TTL_MS;
  return record;
}

private async invalidateCache(): Promise<void> {
  this.cacheExpiry = 0;
  this.cachedRecord = null;
  await this.cache.del(CACHE_KEYS.KILL_SWITCH);
}


  private async fetchFromDb(): Promise<KillSwitch | null> {
    return this.repo.findOne({ where: {} });
  }

  private async getRecord(): Promise<KillSwitch> {
    const record = await this.repo.findOne({ where: {} });
    if (!record)
      return this.repo.save(
        this.repo.create({ isActive: false, auditLog: [], killedServices: [] }),
      );
    return record;
  }

  private async ensureRecord(): Promise<void> {
    const count = await this.repo.count();
    if (count === 0) {
      await this.repo.save(
        this.repo.create({ isActive: false, auditLog: [], killedServices: [] }),
      );
    }
  }
}