import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { CreateDriverTripDto } from '../dtos/create-driver.dto';
import { DriverTripService } from '../services/driver.service';


@Injectable()
export class CreateDriverTripUsecase extends Usecase {
  constructor(private readonly driverTripserviceService: DriverTripService) {
    super();
  }

  async execute(_entityManager: EntityManager, args: { id: string, dto:CreateDriverTripDto }) {
    return this.driverTripserviceService.createTrip(args.id, args.dto, _entityManager);
  }
}