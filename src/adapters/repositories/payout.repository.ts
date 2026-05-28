import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Payout } from '@modules/core/entities/payout.entity';

@Injectable()
export class PayoutRepository extends Repository<Payout> {
  constructor(
    @InjectRepository(Payout)
    private readonly payoutRepository: Repository<Payout>,
    private readonly entityManager: EntityManager,
  ) {
    super(payoutRepository.target, payoutRepository.manager, payoutRepository.queryRunner);
  }

  async createPayout(data: Partial<Payout>, entityManager?: EntityManager): Promise<Payout> {
    const manager = entityManager || this.entityManager;
    const payout = manager.create(Payout, data);
    return manager.save(Payout, payout);
  }

  async findByReference(reference: string): Promise<Payout> {
    return this.findOne({ where: { reference }, relations: ['driver'] });
  }

  async updatePayout(id: string, data: Partial<Payout>, entityManager?: EntityManager): Promise<Payout> {
    const manager = entityManager || this.entityManager;
    await manager.update(Payout, id, data);
    return manager.findOne(Payout, { where: { id } });
  }
}
