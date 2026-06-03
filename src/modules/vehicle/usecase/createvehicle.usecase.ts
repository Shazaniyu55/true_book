import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { VehicleService } from '../service/vehicle.service';
import { CreateVehicleDto } from '../dto/vehicle.dto';

@Injectable()
export class CreateVehicleUsecase extends Usecase {
  constructor(private readonly vehicleService: VehicleService) {
    super();
  }

  async execute(entityManager: EntityManager, args: { id: string; dto: CreateVehicleDto }) {
    return this.vehicleService.registerVehicle(args.id, args.dto, entityManager);
  }
}