import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { DriverTripService } from '../services/driver.service';


@Injectable()
export class GetVehicleTypeUsecase extends Usecase {
  constructor(private readonly driverTripserviceService: DriverTripService) {
    super();
  }

  async execute(_entityManager: EntityManager, ) {
    return this.driverTripserviceService.getVehicleType();
  }
}