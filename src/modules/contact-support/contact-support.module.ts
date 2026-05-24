import { Broker } from '@broker/broker';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContactSupportController } from './controllers/contact-support.controller';
import { ContactSupport } from '@modules/core/entities/contact-support.entity';
import { ContactSupportRepository } from '@adapters/repositories/contact-support.repository';
import { ContactSupportService } from './services/contact-support.service';
import { CreateContactSupportUseCase } from './usecases/create-support.usecase';
import { GetContactSupportUseCase } from './usecases/get-support.usecase';
import { UpdateContactSupportUseCase } from './usecases/update-support.usecase';


@Module({
  imports: [TypeOrmModule.forFeature([ContactSupport])],
  controllers: [ContactSupportController],
  providers: [
    Broker,
    ContactSupportRepository,
    ContactSupportService,
    CreateContactSupportUseCase,
    GetContactSupportUseCase,
    UpdateContactSupportUseCase,
  ],
  exports: [ContactSupportService, ContactSupportRepository],
})
export class ContactSupportModule {}