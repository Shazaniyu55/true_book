import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { DriverTripService } from '../services/driver.service';

@Injectable()
export class GetDriverDashboardUsecase extends Usecase {
  constructor(private readonly driverService: DriverTripService) { super(); }

  async execute(
    _em: EntityManager,
    args: { id: string; query: { page?: number; limit?: number } },
  ) {
    return this.driverService.getDriverDashboard(args.id, args.query);
  }
}