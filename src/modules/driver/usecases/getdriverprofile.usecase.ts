import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { DriverTripService } from '../services/driver.service';

@Injectable()
export class GetDriverProfileUsecase extends Usecase {
  constructor(private readonly driverService: DriverTripService) {
    super();
  }

  async execute(_entityManager: EntityManager, args: { id: string }) {
    return this.driverService.getProfile(args.id);
  }
}