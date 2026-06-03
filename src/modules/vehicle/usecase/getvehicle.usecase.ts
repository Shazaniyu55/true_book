import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { VehicleService } from '../service/vehicle.service';

@Injectable()
export class GetMyVehicleUsecase extends Usecase {
  constructor(private readonly vehicleService: VehicleService) {
    super();
  }

  async execute(_entityManager: EntityManager, args: { id: string }) {
    return this.vehicleService.getMyVehicle(args.id);
  }
}