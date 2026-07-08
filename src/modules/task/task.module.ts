import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Trip } from '@modules/core/entities/trip.entity';
import { Booking } from '@modules/core/entities/booking.entity';

import { TasksService } from './task.service';
import { HealthController } from './health.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Trip, Booking])],
  controllers: [HealthController],
  providers: [TasksService],
})
export class TasksModule {}