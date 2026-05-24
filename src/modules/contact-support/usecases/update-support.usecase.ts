import { Injectable } from '@nestjs/common';
import { ContactSupportService } from '../services/contact-support.service';
import { UpdateContactSupportDto } from '../dtos/dto';
import { ContactSupport } from '@modules/core/entities/contact-support.entity';

@Injectable()
export class UpdateContactSupportUseCase {
  constructor(private readonly contactSupportService: ContactSupportService) {}

  async execute(id: string, data: UpdateContactSupportDto): Promise<ContactSupport> {
    return this.contactSupportService.updateContactSupport(id, data);
  }
}