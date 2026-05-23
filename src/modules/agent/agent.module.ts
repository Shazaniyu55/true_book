import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Agent } from '@modules/core/entities/agent.entity';
import { Booking } from '@modules/core/entities/booking.entity';
import { Trip } from '@modules/core/entities/trip.entity';
import { Passenger } from '@modules/core/entities/passenger.entity';
import { Payout } from '@modules/core/entities/payout.entity';
import { AgentCommission } from '../.../../core/entities/agent-commission.entity';
import { PaymentFactory } from '@adapters/payment/payment.factory';
import { PaystackAdapter } from '@adapters/payment/paystack/paystack.adapter';
import { PaystackProvider } from '@adapters/payment/paystack/providers/paystack.provider';
import { FlutterwaveAdapter } from '@adapters/payment/flutterwave/flutterwave.adapter';
import { FlutterwaveProvider } from '@adapters/payment/flutterwave/providers/flutterwave.provider';
import { RandomnessUtil } from '@shared/utils/encryption/randomness.util';
import { Broker } from '@broker/broker';
import { AgentService } from './services/agent.service';
import { AgentController } from './controllers/agent.controller';
import { KillSwitch } from '@modules/core/entities/kill-switch.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Agent, Booking, Trip, Passenger, Payout, AgentCommission, KillSwitch]),
  ],
  controllers: [AgentController],
  providers: [
    Broker,
    AgentService,
    PaymentFactory,
    PaystackAdapter,
    PaystackProvider,
    FlutterwaveAdapter,
    FlutterwaveProvider,
    RandomnessUtil,
  ],
  exports: [AgentService],
})
export class AgentModule {}
