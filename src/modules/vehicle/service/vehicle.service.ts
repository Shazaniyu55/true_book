import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Driver } from '@modules/core/entities/driver.entity';
import { Vehicle } from '@modules/core/entities/vehicle.entity';
import { VehicleRepository } from '@adapters/repositories/vehicle.repository';
import { CreateVehicleDto } from '../dto/vehicle.dto';

@Injectable()
export class VehicleService {
  constructor(
    private readonly vehicleRepo: VehicleRepository,
    @InjectRepository(Driver) private readonly driverRepo: Repository<Driver>,
  ) {}

  async registerVehicle(userId: string, dto: CreateVehicleDto, em?: EntityManager) {
    const driver = await this.driverRepo.findOne({ where: { userId } });
    if (!driver) throw new NotFoundException('Driver profile not found');

    // One vehicle per driver
    const existing = await this.vehicleRepo.findByDriverId(driver.id);
    if (existing) {
      throw new ConflictException('You already have a registered vehicle');
    }

    // Plate must be globally unique
    const plateTaken = await this.vehicleRepo.findByPlate(dto.plateNumber);
    if (plateTaken) {
      throw new BadRequestException('A vehicle with this plate number already exists');
    }

    const vehicle = await this.vehicleRepo.createVehicle(
      { ...dto, driverId: driver.id, isActive: true, isVerified: false },
      em,
    );

    await this.driverRepo.update({ id: driver.id }, { vehicleId: vehicle.id });

    return vehicle;
  }

  async getMyVehicle(userId: string): Promise<Vehicle> {
    const driver = await this.driverRepo.findOne({ where: { userId } });
    if (!driver) throw new NotFoundException('Driver profile not found');

    const vehicle = await this.vehicleRepo.findByDriverId(driver.id);
    if (!vehicle) throw new NotFoundException('No vehicle registered');
    return vehicle;
  }
}