import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { AdminService } from '../services/admin.service';

@Injectable()
export class GetTotalApproveDriverUsecase extends Usecase {
  constructor(private readonly adminService: AdminService) {
    super();
  }

 async execute(_entityManager: EntityManager) {
  const total = await this.adminService.getTotalApproveDriver();
  return { total };
}
}