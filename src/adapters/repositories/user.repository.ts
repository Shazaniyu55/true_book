import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { User } from '@modules/core/entities/user.entity';

@Injectable()
export class UserRepository extends Repository<User> {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly entityManager: EntityManager,
  ) {
    super(userRepository.target, userRepository.manager, userRepository.queryRunner);
  }

  async createUser(data: Partial<User>, entityManager?: EntityManager): Promise<User> {
    const manager = entityManager || this.entityManager;
    const user = manager.create(User, data);
    return manager.save(User, user);
  }

  async findByEmail(email: string): Promise<User> {
    return this.findOne({ where: { email: email.toLowerCase() } });
  }

  async findByPhone(phone: string): Promise<User> {
    return this.findOne({ where: { phone } });
  }

  async findByReferralCode(referralCode: string): Promise<User> {
    return this.findOne({ where: { referralCode } });
  }

  async updateUser(id: string, data: Partial<User>, entityManager?: EntityManager): Promise<User> {
    const manager = entityManager || this.entityManager;
    await manager.update(User, id, data);
    return manager.findOne(User, { where: { id } });
  }
}
