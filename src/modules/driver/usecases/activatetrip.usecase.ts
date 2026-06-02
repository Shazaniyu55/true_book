import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { DriverTripService } from '../services/driver.service';


@Injectable()
export class ActivateDriverTripUsecase extends Usecase {
  constructor(private readonly driverTripserviceService: DriverTripService) {
    super();
  }

  async execute(_entityManager: EntityManager, args: { id: string, tripId: string }) {
    return this.driverTripserviceService.activateTrip(args.id, args.tripId);
  }
}