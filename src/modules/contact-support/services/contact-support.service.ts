import { ContactSupportRepository } from '@adapters/repositories/contact-support.repository';
import { ContactSupport } from '@modules/core/entities/contact-support.entity';
import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateContactSupportDto, UpdateContactSupportDto } from '../dtos/dto';
import { ContactSupportStatus, UserRole } from 'src/types/enums';

@Injectable()
export class ContactSupportService {
  constructor(private readonly contactSupportRepository: ContactSupportRepository) {}

  async createContactSupport(data: CreateContactSupportDto): Promise<ContactSupport> {
    // You can add additional validation or logic here
    if (!data.user_type) {
      data.user_type = UserRole.GUEST;
    }

    const contactSupport = await this.contactSupportRepository.createContactSupport({
      ...data,
      status: ContactSupportStatus.PENDING,
    });

    // TODO: Send email notification to admin or support team
    // await this.emailService.notifyAdminNewSupportRequest(contactSupport);

    return contactSupport;
  }

  async getAllContactSupports(page: number = 1, limit: number = 10): Promise<{
    data: ContactSupport[];
    total: number;
    page: number;
    limit: number;
  }> {
    const skip = (page - 1) * limit;
    const [data, total] = await this.contactSupportRepository.findAll(skip, limit);

    return { data, total, page, limit };
  }

  async getContactSupportById(id: string): Promise<ContactSupport> {
    const contactSupport = await this.contactSupportRepository.findById(id);

    if (!contactSupport) {
      throw new NotFoundException(`Contact support request with id ${id} not found`);
    }

    return contactSupport;
  }

  async getContactSupportsByEmail(email: string): Promise<ContactSupport[]> {
    return this.contactSupportRepository.findByEmail(email);
  }

  async getContactSupportsByStatus(
    status: ContactSupportStatus,
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    data: ContactSupport[];
    total: number;
    page: number;
    limit: number;
  }> {
    const skip = (page - 1) * limit;
    const [data, total] = await this.contactSupportRepository.findByStatus(status, skip, limit);

    return { data, total, page, limit };
  }

  async getContactSupportsByUserType(
    userType: UserRole,
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    data: ContactSupport[];
    total: number;
    page: number;
    limit: number;
  }> {
    const skip = (page - 1) * limit;
    const [data, total] = await this.contactSupportRepository.findByUserType(userType, skip, limit);

    return { data, total, page, limit };
  }

  async getPendingRequests(page: number = 1, limit: number = 10): Promise<{
    data: ContactSupport[];
    total: number;
    page: number;
    limit: number;
  }> {
    const skip = (page - 1) * limit;
    const [data, total] = await this.contactSupportRepository.findPending(skip, limit);

    return { data, total, page, limit };
  }

  async updateContactSupport(
    id: string,
    data: UpdateContactSupportDto,
  ): Promise<ContactSupport> {
    const contactSupport = await this.getContactSupportById(id);

    if (!contactSupport) {
      throw new NotFoundException(`Contact support request with id ${id} not found`);
    }

    const updated = await this.contactSupportRepository.updateContactSupport(id, data);

    // TODO: Send notification email if status changed
    // if (data.status && data.status !== contactSupport.status) {
    //   await this.emailService.notifyStatusChange(updated);
    // }

    return updated;
  }

  async updateStatus(id: string, status: ContactSupportStatus): Promise<ContactSupport> {
    const contactSupport = await this.getContactSupportById(id);

    if (!contactSupport) {
      throw new NotFoundException(`Contact support request with id ${id} not found`);
    }

    const updated = await this.contactSupportRepository.updateStatus(id, status);

    // TODO: Send notification email when status changes
    // await this.emailService.notifyStatusChange(updated);

    return updated;
  }

  async deleteContactSupport(id: string): Promise<{ message: string }> {
    const contactSupport = await this.getContactSupportById(id);

    if (!contactSupport) {
      throw new NotFoundException(`Contact support request with id ${id} not found`);
    }

    await this.contactSupportRepository.deleteContactSupport(id);

    return { message: 'Contact support request deleted successfully' };
  }

  async getStatistics(): Promise<{
    total: number;
    pending: number;
    in_progress: number;
    resolved: number;
    closed: number;
  }> {
    return this.contactSupportRepository.getStatistics();
  }
}