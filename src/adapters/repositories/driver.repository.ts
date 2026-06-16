import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Driver } from '@modules/core/entities/driver.entity';
import { UpdateDriverProfileDto } from '@modules/driver/dtos/updatedriver.dto';

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

  async findByUserId(id: string): Promise<Driver> {
    return this.findOne({ where: { id }, relations: ['users'] });
  }



  async updateDriver(
    id: string,
    dto: UpdateDriverProfileDto,
    entityManager?: EntityManager,
  ): Promise<Driver> {
    const manager = entityManager || this.entityManager;
  
    const driver = await this.driverRepository.findOne({
      where: { id },
      relations: ['user'],
    });
  
    if (!driver) {
      throw new NotFoundException('Driver profile not found');
    }
  
    // ---------------------------
    // Update User fields
    // ---------------------------
    const userUpdates: Partial<Driver> = {};
  
    if (dto.firstName) userUpdates.user.firstName = dto.firstName;
    if (dto.lastName) userUpdates.user.lastName = dto.lastName;
    if (dto.phone) userUpdates.user.phone = dto.phone;
    if (dto.fullName) userUpdates.user.lastName = dto.fullName;
    if (dto.profileImage) userUpdates.user.profileImage = dto.profileImage;
  
    if (Object.keys(userUpdates).length > 0) {
      await manager.update(Driver, driver.user.id, userUpdates);
    }
  
    // ---------------------------
    // Update Passenger fields
    // ---------------------------
    const driverUpdates: Partial<Driver> = {};
  
    if (dto.state) {
      driverUpdates.user.metadata = {
        ...(driver.user.metadata ?? {}),
        state: dto.state,
      };
    }
  
    if (Object.keys(driverUpdates).length > 0) {
      await manager.update(Driver, id, driverUpdates);
    }
  
    // ---------------------------
    // Returns data
    // ---------------------------
    return await this.driverRepository.findOne({
      where: { id },
      relations: ['user'],
    });
  }
}
