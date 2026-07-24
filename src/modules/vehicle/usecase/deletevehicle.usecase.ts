import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { VehicleService } from '../service/vehicle.service';

@Injectable()
export class DeleteVehicleUsecase extends Usecase {
  constructor(private readonly vehicleService: VehicleService) { super(); }

  async execute(_entityManager: EntityManager, args: { userId: string; vehicleId: string }) {
    return this.vehicleService.deleteVehicle(args.userId, args.vehicleId);
  }
}