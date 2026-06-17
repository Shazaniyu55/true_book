import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { DriverTripService } from '../services/driver.service';

@Injectable()
export class GetDriverTripStatusUsecase extends Usecase {
  constructor(private readonly driverService: DriverTripService) { super(); }

  async execute(_em: EntityManager, args: { id: string; type?: string }) {
    return this.driverService.getDriverTripStatus(args.id, args.type);
  }
}