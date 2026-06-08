import { Broker } from '@broker/broker';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContactSupportController } from './controllers/contact-support.controller';
import { ContactSupport } from '@modules/core/entities/contact-support.entity';
import { ContactSupportService } from './services/contact-support.service';
import { Driver } from '@modules/core/entities/driver.entity';
import { Passenger } from '@modules/core/entities/passenger.entity';
import { Agent } from '@modules/core/entities/agent.entity';
import { EmailModule } from '@modules/email/email.module';



@Module({
  
  imports: [TypeOrmModule.forFeature([ContactSupport, Driver, Passenger, Agent]), EmailModule],
  controllers: [ContactSupportController],
  providers: [
    Broker,
    ContactSupportService,
  ],
  exports: [ContactSupportService],
})
export class ContactSupportModule {}