import { Injectable } from '@nestjs/common';
import { ContactSupportService } from '../services/contact-support.service';
import { ContactSupport } from '@modules/core/entities/contact-support.entity';

@Injectable()
export class GetContactSupportUseCase {
  constructor(private readonly contactSupportService: ContactSupportService) {}

  async execute(id: string): Promise<ContactSupport> {
    return this.contactSupportService.getContactSupportById(id);
  }
}