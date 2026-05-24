import { ContactSupport } from '@modules/core/entities/contact-support.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ContactSupportStatus, UserRole } from 'src/types/enums';
import { Repository, EntityManager } from 'typeorm';

@Injectable()
export class ContactSupportRepository extends Repository<ContactSupport> {
  constructor(
    @InjectRepository(ContactSupport)
    private readonly repository: Repository<ContactSupport>,
    private readonly entityManager: EntityManager,
  ) {
    super(repository.target, repository.manager, repository.queryRunner);
  }

  async createContactSupport(
    data: Partial<ContactSupport>,
    entityManager?: EntityManager,
  ): Promise<ContactSupport> {
    const manager = entityManager || this.entityManager;
    const contactSupport = manager.create(ContactSupport, data);
    return manager.save(ContactSupport, contactSupport);
  }

  async findById(id: string): Promise<ContactSupport | null> {
    return this.findOne({ where: { id } });
  }

  async findAll(skip: number = 0, take: number = 10): Promise<[ContactSupport[], number]> {
    return this.findAndCount({
      skip,
      take,
      order: { created_at: 'DESC' },
    });
  }

  async findByStatus(
    status: ContactSupportStatus,
    skip: number = 0,
    take: number = 10,
  ): Promise<[ContactSupport[], number]> {
    return this.findAndCount({
      where: { status },
      skip,
      take,
      order: { created_at: 'DESC' },
    });
  }

  async findByEmail(email: string): Promise<ContactSupport[]> {
    return this.find({
      where: { email },
      order: { created_at: 'DESC' },
    });
  }

  async findByUserType(
    userType: UserRole,
    skip: number = 0,
    take: number = 10,
  ): Promise<[ContactSupport[], number]> {
    return this.findAndCount({
      where: { user_type: userType },
      skip,
      take,
      order: { created_at: 'DESC' },
    });
  }

  async findPending(skip: number = 0, take: number = 10): Promise<[ContactSupport[], number]> {
    return this.findByStatus(ContactSupportStatus.PENDING, skip, take);
  }

  async updateStatus(
    id: string,
    status: ContactSupportStatus,
    entityManager?: EntityManager,
  ): Promise<ContactSupport> {
    const manager = entityManager || this.entityManager;
    await manager.update(ContactSupport, id, { status });
    return this.findById(id);
  }

  async updateContactSupport(
    id: string,
    data: Partial<ContactSupport>,
    entityManager?: EntityManager,
  ): Promise<ContactSupport> {
    const manager = entityManager || this.entityManager;
    await manager.update(ContactSupport, id, data);
    return this.findById(id);
  }

  async deleteContactSupport(id: string, entityManager?: EntityManager): Promise<void> {
    const manager = entityManager || this.entityManager;
    await manager.delete(ContactSupport, id);
  }

  async getStatistics(): Promise<{
    total: number;
    pending: number;
    in_progress: number;
    resolved: number;
    closed: number;
  }> {
    const total = await this.count();
    const pending = await this.count({ where: { status: ContactSupportStatus.PENDING } });
    const in_progress = await this.count({ where: { status: ContactSupportStatus.IN_PROGRESS } });
    const resolved = await this.count({ where: { status: ContactSupportStatus.RESOLVED } });
    const closed = await this.count({ where: { status: ContactSupportStatus.CLOSED } });

    return { total, pending, in_progress, resolved, closed };
  }
}