import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { AdminService } from '../services/admin.service';

@Injectable()
export class GetAgentsUsecase extends Usecase {
  constructor(private readonly adminService: AdminService) {
    super();
  }

  async execute(_entityManager: EntityManager, _args: any, query: { page?: number; limit?: number }) {
    return this.adminService.getAgents(query);
  }
}