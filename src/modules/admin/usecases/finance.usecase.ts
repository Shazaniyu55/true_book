import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { AdminService } from '../services/admin.service';

@Injectable()
export class GetDriversEarningsUsecase extends Usecase {
  constructor(private readonly adminService: AdminService) {
    super();
  }
  async execute(_entityManager: EntityManager, args: { query: any }) {
    return this.adminService.getDriversEarnings(args.query);
  }
}

@Injectable()
export class GetAgentsEarningsUsecase extends Usecase {
  constructor(private readonly adminService: AdminService) {
    super();
  }
  async execute(_entityManager: EntityManager, args: { query: any }) {
    return this.adminService.getAgentsEarnings(args.query);
  }
}

@Injectable()
export class GetRefundRequestsUsecase extends Usecase {
  constructor(private readonly adminService: AdminService) {
    super();
  }
  async execute(_entityManager: EntityManager, args: { query: any }) {
    return this.adminService.getRefundRequests(args.query);
  }
}