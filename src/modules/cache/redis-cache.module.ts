import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis-cache.constants';
import { RedisCacheService } from './redis-cache.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): Redis => {
        const host = configService.get<string>('common.redis.host', 'redis-15370.crce309.us-east-1-6.ec2.cloud.redislabs.com');
        const port = configService.get<number>('common.redis.port', 15370);
        const password = configService.get<string>('common.redis.password');
        const db = configService.get<number>('common.redis.db', 0);

        const client = new Redis({
          host,
          port,
          ...(password ? { password } : {}),
          db,
          lazyConnect: true,
          retryStrategy: (times) => Math.min(times * 100, 3000),
          maxRetriesPerRequest: 3,
        });

        client.on('connect', () => console.log('✓ Redis connected'));
        client.on('error', (err) => console.error('Redis error:', err.message));

        return client;
      },
    },
    RedisCacheService,
  ],
  exports: [REDIS_CLIENT, RedisCacheService],
})
export class RedisCacheModule {}