import { ContactSupport } from '@modules/core/entities/contact-support.entity';
import { Injectable, NotFoundException } from '@nestjs/common';
import { ContactSupportQueryDto, ContactSupportStatus, UserRole, CreateContactSupportDto } from 'src/types/enums';
import { PagedDto } from '@shared/interface/paged.interface';
import { User } from '@modules/core/entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Driver } from '@modules/core/entities/driver.entity';
import { Repository } from 'typeorm';
import { Passenger } from '@modules/core/entities/passenger.entity';
import { Agent } from '@modules/core/entities/agent.entity';
import { EmailService } from '@modules/email/email.service';

@Injectable()
export class ContactSupportService {
  constructor(
    @InjectRepository(ContactSupport) private readonly contactRepo: Repository<ContactSupport>,
    @InjectRepository(Driver) private readonly driverRepo: Repository<Driver>,
    @InjectRepository(Passenger) private readonly passengerRepo: Repository<Passenger>,
    @InjectRepository(Agent) private readonly agentRepo: Repository<Agent>,
    private readonly emailService: EmailService

  ) {}

    private async getSupportEmail(userId?: string): Promise<{ email: string; userType: UserRole }> {
    if (!userId) {
      return {
        email: 'trubookersupport@trubooker.com',
        userType: UserRole.PASSENGER,
      };
    }

    // Check if user is a driver
    const driver = await this.driverRepo.findOne({ where: { userId } });
    if (driver) {
      return {
        email: 'drivers@email.trubooker.com',
        userType: UserRole.DRIVER,
      };
    }

    // Check if user is a passenger
    const passenger = await this.passengerRepo.findOne({ where: { userId } });
    if (passenger) {
      return {
        email: 'passengers@email.trubooker.com',
        userType: UserRole.PASSENGER,
      };
    }

    // Check if user is an agent
    const agent = await this.agentRepo.findOne({ where: { userId } });
    if (agent) {
      return {
        email: 'agentsupport@trubooker.com',
        userType: UserRole.AGENT,
      };
    }

    // Default fallback
    return {
      email: 'trubookersupport@trubooker.com',
      userType: UserRole.PASSENGER,
    };
  }

  // ─── Create Contact Support Request ──────────────────────────────────────

  async create(dto: CreateContactSupportDto, user?: User) {
    // Resolve name and email — authenticated user takes priority
    const name = user
      ? `${user.firstName} ${user.lastName}`.trim()
      : `${dto.firstName ?? ''} ${dto.lastName ?? ''}`.trim();

    const email = user ? user.email : dto.email;

    // Determine user type and support email
    const { email: supportEmail, userType } = await this.getSupportEmail(user?.id);

    // Save to DB
    const contact = this.contactRepo.create({
      name,
      email,
      subject: dto.subject,
      message: dto.message,
      user_type: userType,
      status: ContactSupportStatus.PENDING,
    });

    const saved = await this.contactRepo.save(contact);

    // Send email — non-blocking, failure won't break the response
    try {
      await this.emailService.sendContactSupportNotification({
         to: supportEmail,
      name,
      email,
      subject: dto.subject,
      message: dto.message,
      contactId: saved.id,
      userType,
      });
    } catch (error) {
      console.error(' Contact support email failed:', error?.message);
    }

    return saved;
  }

  // ─── Get All Contact Requests (Admin) ────────────────────────────────────

  async getAllRequests(query: ContactSupportQueryDto) {
    const { page = 1, limit = 10, search, status, userType } = query;
    const skip = (page - 1) * limit;

    const qb = this.contactRepo
      .createQueryBuilder('c')
      .orderBy('c.created_at', 'DESC')
      .skip(skip)
      .take(limit);

    if (status) {
      qb.andWhere('c.status = :status', { status });
    }

    if (userType) {
      qb.andWhere('c.userType = :user_type', { userType });
    }

    if (search) {
      qb.andWhere(
        '(c.subject ILIKE :search OR c.message ILIKE :search OR c.email ILIKE :search OR c.name ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    const [data, total] = await qb.getManyAndCount();

    return {
    data,
    meta: {
      page,
      limit,
      count: data.length,
      previousPage: page > 1 ? page - 1 : false,
      nextPage: skip + limit < total ? page + 1 : false,
      pageCount: Math.ceil(total / limit),
      totalRecords: total,
    },
  };
  }

  // ─── Get Single Request ───────────────────────────────────────────────────

  async getById(id: string) {
    const contact = await this.contactRepo.findOne({ where: { id } });
    if (!contact) throw new NotFoundException('Contact support request not found');
    return contact;
  }

  // ─── Update Status (Admin) ────────────────────────────────────────────────

  async updateStatus(id: string, status: ContactSupportStatus) {
    const contact = await this.getById(id);
    contact.status = status;
    return this.contactRepo.save(contact);
  }

  // ─── Get User's Own Requests ──────────────────────────────────────────────

  async getUserRequests(userEmail: string, query: ContactSupportQueryDto) {
    const { page = 1, limit = 10, search, status } = query;
    const skip = (page - 1) * limit;

    const qb = this.contactRepo
      .createQueryBuilder('c')
      .where('c.email = :email', { email: userEmail })
      .orderBy('c.created_at', 'DESC')
      .skip(skip)
      .take(limit);

    if (status) {
      qb.andWhere('c.status = :status', { status });
    }

    if (search) {
      qb.andWhere(
        '(c.subject ILIKE :search OR c.message ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    const [data, total] = await qb.getManyAndCount();

   return {
    data,
    meta: {
      page,
      limit,
      count: data.length,
      previousPage: page > 1 ? page - 1 : false,
      nextPage: skip + limit < total ? page + 1 : false,
      pageCount: Math.ceil(total / limit),
      totalRecords: total,
    },
  };
  }



  
}