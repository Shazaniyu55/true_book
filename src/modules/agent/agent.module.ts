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
import { Driver } from '@modules/core/entities/driver.entity';
import { AgentReferral } from '@modules/core/entities/agent-referral.entity';
import { SystemSettingModule } from '@modules/system/system.module';
import { GetAgentDashboardUsecase } from './usecases/getAgentDashboard.usecase';
import { ReferDriverUsecase } from './usecases/referedriver.usecase';
import { GetDriverReferedUsecase } from './usecases/getDriverrefered.usecase';
import { EarnFromDriverUsecase } from './usecases/earn.usecase';

@Module({
  imports: [
    SystemSettingModule,
    TypeOrmModule.forFeature([Agent,Driver, Booking, Trip, Passenger, AgentReferral, Payout, AgentCommission, KillSwitch]),
  ],
  controllers: [AgentController],
  providers: [
    Broker,
    GetAgentDashboardUsecase,
    ReferDriverUsecase,
    GetDriverReferedUsecase,
    EarnFromDriverUsecase,
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
