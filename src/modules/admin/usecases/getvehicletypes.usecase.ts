import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { DriverTripService } from '@modules/driver/services/driver.service';

@Injectable()
export class AdminGetVehicleTypesUsecase extends Usecase {
  constructor(private readonly driverTripService: DriverTripService) {
    super();
  }

  async execute(_entityManager: EntityManager) {
    return this.driverTripService.getVehicleType();
  }
}