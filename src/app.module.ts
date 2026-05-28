import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import configSchema from '@config/schema.config';
import common from '@config/common.config';
import typeorm from '@config/typeorm.config';
import { Broker } from '@broker/broker';

// ─── Infrastructure modules (global) ─────────────────────────────────────────
import { RedisCacheModule } from './modules/cache/redis-cache.module';
import { EmailModule } from './modules/email/email.module';

// ─── Feature modules ─────────────────────────────────────────────────────────
import { CoreModule } from '@modules/core/core.module';
import { AuthModule } from '@modules/auth/auth.module';
import { DriverModule } from '@modules/driver/driver.module';
import { PassengerModule } from '@modules/passenger/passenger.module';
import { AgentModule } from '@modules/agent/agent.module';
import { AdminModule } from '@modules/admin/admin.module';
import { NotificationModule } from '@modules/notification/notification.module';
import { WebhookModule } from '@modules/webhook/webhook.module';
import { ContactSupportModule } from '@modules/contact-support/contact-support.module';
import { KillSwitchModule } from '@modules/kill-switch/kill-switch.module';
import { TripsModule } from '@modules/trip/trip.module';


@Module({
  imports: [
    ConfigModule.forRoot({
      load: [common, typeorm],
      ...configSchema,
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) =>
        configService.get('typeorm'),
    }),
    
    ThrottlerModule.forRoot([{ ttl: 30000, limit: 10 }]),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),

    // ─── Global infrastructure ─────────────────────────────────────────────
    RedisCacheModule,
    EmailModule,

    // Kill Switch — must come before feature modules
    KillSwitchModule,

    // ─── Feature modules ───────────────────────────────────────────────────
    CoreModule,
    AuthModule,
    DriverModule,
    PassengerModule,
    AgentModule,
    AdminModule,
    NotificationModule,
    WebhookModule,
    ContactSupportModule,
    TripsModule,
   
  ],
  controllers: [],
  providers: [
    Broker,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
  exports: [Broker],
})
export class AppModule {}