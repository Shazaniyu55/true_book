import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { CreateDriverTripDto, UpdateDriverTripDto } from '../dtos/create-driver.dto';
import { DriverTripService } from '../services/driver.service';


@Injectable()
export class UpdateDriverTripUsecase extends Usecase {
  constructor(private readonly driverTripserviceService: DriverTripService) {
    super();
  }

  async execute(_entityManager: EntityManager, args: { id: string, tripId: string, dto:UpdateDriverTripDto }) {
    return this.driverTripserviceService.updateTrip(args.id, args.tripId, args.dto, _entityManager);
  }
}