import { Injectable } from '@nestjs/common';
import { ContactSupportService } from '../services/contact-support.service';
import { CreateContactSupportDto } from '../dtos/dto';
import { ContactSupport } from '@modules/core/entities/contact-support.entity';

@Injectable()
export class CreateContactSupportUseCase {
  constructor(private readonly contactSupportService: ContactSupportService) {}

  async execute(data: CreateContactSupportDto): Promise<ContactSupport> {
    return this.contactSupportService.createContactSupport(data);
  }
}