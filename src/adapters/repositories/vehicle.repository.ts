import { Vehicle } from '@modules/core/entities/vehicle.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';

@Injectable()
export class VehicleRepository extends Repository<Vehicle> {
  constructor(
    @InjectRepository(Vehicle)
    private readonly vehicleRepository: Repository<Vehicle>,
    private readonly entityManager: EntityManager,
  ) {
    super(vehicleRepository.target, vehicleRepository.manager, vehicleRepository.queryRunner);
  }

  async createVehicle(data: Partial<Vehicle>, entityManager?: EntityManager): Promise<Vehicle> {
    const manager = entityManager || this.entityManager;
    const vehicle = manager.create(Vehicle, data);
    return manager.save(Vehicle, vehicle);
  }

  async findByDriverId(driverId: string): Promise<Vehicle> {
    return this.findOne({ where: { driverId } });
  }

  async findByPlate(plateNumber: string): Promise<Vehicle> {
    return this.findOne({ where: { plateNumber } });
  }
}