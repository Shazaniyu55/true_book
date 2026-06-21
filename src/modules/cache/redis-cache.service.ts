import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis-cache.constants';

@Injectable()
export class RedisCacheService {
  private readonly logger = new Logger(RedisCacheService.name);
  private readonly isConnected: boolean;

  constructor(
    @Optional() @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {
    this.isConnected = !!redis;
  }

   async onModuleInit() {
    if (!this.isConnected) {
      this.logger.warn('Redis client not provided — caching disabled, app will run uncached');
      return;
    }
    try {
      const pong = await this.redis.ping();   // forces the lazy connection to open
      this.logger.log(`✓ Redis connected (ping: ${pong})`);
    } catch (err) {
      this.logger.error(`✗ Redis connection failed: ${err.message}`);
    }
  }

  async get<T = any>(key: string): Promise<T | null> {
    if (!this.isConnected) return null;
    try {
      const value = await this.redis.get(key);
      if (!value) return null;
      return JSON.parse(value) as T;
    } catch (error) {
      this.logger.warn(`Cache GET failed for key "${key}": ${error.message}`);
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    if (!this.isConnected) return;
    try {
      const serialised = JSON.stringify(value);
      if (ttlSeconds) {
        await this.redis.setex(key, ttlSeconds, serialised);
      } else {
        await this.redis.set(key, serialised);
      }
    } catch (error) {
      this.logger.warn(`Cache SET failed for key "${key}": ${error.message}`);
    }
  }

  async del(key: string): Promise<void> {
    if (!this.isConnected) return;
    try {
      await this.redis.del(key);
    } catch (error) {
      this.logger.warn(`Cache DEL failed for key "${key}": ${error.message}`);
    }
  }

  async delMany(pattern: string): Promise<void> {
    if (!this.isConnected) return;
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length) await this.redis.del(...keys);
    } catch (error) {
      this.logger.warn(`Cache DEL pattern failed for "${pattern}": ${error.message}`);
    }
  }

  async getOrSet<T = any>(
    key: string,
    factory: () => Promise<T>,
    ttlSeconds?: number,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;
    const value = await factory();
    await this.set(key, value, ttlSeconds);
    return value;
  }

  async exists(key: string): Promise<boolean> {
    if (!this.isConnected) return false;
    try {
      return (await this.redis.exists(key)) === 1;
    } catch {
      return false;
    }
  }

  async ttl(key: string): Promise<number> {
    if (!this.isConnected) return -1;
    return this.redis.ttl(key);
  }

  async flushAll(): Promise<void> {
    if (!this.isConnected) return;
    await this.redis.flushall();
  }

  /** Health check — ping the Redis instance */
  async ping(): Promise<boolean> {
    if (!this.isConnected) return false;
    try {
      const pong = await this.redis.ping();
      return pong === 'PONG';
    } catch {
      return false;
    }
  }
}