import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { AdminService } from '../services/admin.service';

@Injectable()
export class GetPassengersUsecase extends Usecase {
  constructor(private readonly adminService: AdminService) {
    super();
  }

async execute(
  _entityManager: EntityManager,
  args: { page?: number; limit?: number; search?: string },
) {
  return this.adminService.getPassengers(args);
}

}