import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { DriverTripService } from '../services/driver.service';
import { CancelDriverTripDto } from '../dtos/create-driver.dto';


@Injectable()
export class CancleDriverTripUsecase extends Usecase {
  constructor(private readonly driverTripserviceService: DriverTripService) {
    super();
  }

  async execute(_entityManager: EntityManager, args: { id: string, tripId: string, dto:CancelDriverTripDto }) {
    return this.driverTripserviceService.cancelTrip(args.id, args.tripId, args.dto, _entityManager);
  }
}