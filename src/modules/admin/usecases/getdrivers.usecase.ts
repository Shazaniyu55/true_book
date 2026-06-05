import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { AdminService } from '../services/admin.service';

@Injectable()
export class GetDriversUsecase extends Usecase {
  constructor(private readonly adminService: AdminService) {
    super();
  }

  async execute(_entityManager: EntityManager, _args: any, query: {
  page?: number;
  limit?: number;
  search?: string;
  kycStatus?: string;
  status?: string;
}) {
    return this.adminService.getDrivers(query);
  }
}