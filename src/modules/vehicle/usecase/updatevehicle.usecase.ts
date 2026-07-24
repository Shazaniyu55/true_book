import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { VehicleService } from '../service/vehicle.service';
import { UpdateVehicleDto } from '../dto/vehicle.dto';

@Injectable()
export class UpdateVehicleUsecase extends Usecase {
  constructor(private readonly vehicleService: VehicleService) { super(); }

  async execute(
    _entityManager: EntityManager,
    args: { userId: string; vehicleId: string; dto: UpdateVehicleDto },
  ) {
    return this.vehicleService.updateVehicle(args.userId, args.vehicleId, args.dto);
  }
}