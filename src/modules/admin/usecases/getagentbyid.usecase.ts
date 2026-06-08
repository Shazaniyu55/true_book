import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { AdminService } from '../services/admin.service';

@Injectable()
export class GetAgentByIdUsecase extends Usecase {
  constructor(private readonly adminService: AdminService) {
    super();
  }

  async execute(_entityManager: EntityManager, arg:{id: any}) {
    return this.adminService.getAgentById(arg.id);
  }
}