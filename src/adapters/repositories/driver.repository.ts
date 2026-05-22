import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Driver } from '@modules/core/entities/driver.entity';

@Injectable()
export class DriverRepository extends Repository<Driver> {
  constructor(
    @InjectRepository(Driver)
    private readonly driverRepository: Repository<Driver>,
    private readonly entityManager: EntityManager,
  ) {
    super(driverRepository.target, driverRepository.manager, driverRepository.queryRunner);
  }

  async createDriver(data: Partial<Driver>, entityManager?: EntityManager): Promise<Driver> {
    const manager = entityManager || this.entityManager;
    const driver = manager.create(Driver, data);
    return manager.save(Driver, driver);
  }

  async findByUserId(userId: number): Promise<Driver> {
    return this.findOne({ where: { userId }, relations: ['user'] });
  }

  async updateDriver(id: number, data: Partial<Driver>, entityManager?: EntityManager): Promise<Driver> {
    const manager = entityManager || this.entityManager;
    await manager.update(Driver, id, data);
    return manager.findOne(Driver, { where: { id } });
  }
}
