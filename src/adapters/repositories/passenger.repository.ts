import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Passenger } from '@modules/core/entities/passenger.entity';

@Injectable()
export class PassengerRepository extends Repository<Passenger> {
  constructor(
    @InjectRepository(Passenger)
    private readonly passengerRepository: Repository<Passenger>,
    private readonly entityManager: EntityManager,
  ) {
    super(passengerRepository.target, passengerRepository.manager, passengerRepository.queryRunner);
  }

  async createPassenger(data: Partial<Passenger>, entityManager?: EntityManager): Promise<Passenger> {
    const manager = entityManager || this.entityManager;
    const passenger = manager.create(Passenger, data);
    return manager.save(Passenger, passenger);
  }

  async findByUserId(userId: number): Promise<Passenger> {
    return this.findOne({ where: { userId }, relations: ['user'] });
  }

  async updatePassenger(id: number, data: Partial<Passenger>, entityManager?: EntityManager): Promise<Passenger> {
    const manager = entityManager || this.entityManager;
    await manager.update(Passenger, id, data);
    return manager.findOne(Passenger, { where: { id } });
  }
}
