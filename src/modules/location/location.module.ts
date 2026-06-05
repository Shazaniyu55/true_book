import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { Trip } from '@modules/core/entities/trip.entity';
import { Driver } from '@modules/core/entities/driver.entity';
import { TripLocation } from '@modules/core/entities/triplocation.entity';
import { RidesGateway } from '@modules/gateways/gateway';
import { LocationService } from './service/location.service';
import { LocationController } from './controller/location.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([TripLocation, Trip, Driver]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('common.auth.jwt.accessSecret'),
      }),
    }),
  ],
  controllers: [LocationController],
  providers: [RidesGateway, LocationService],
  exports: [RidesGateway, LocationService],
})
export class LocationModule {}