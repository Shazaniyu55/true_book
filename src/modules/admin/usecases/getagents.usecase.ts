import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { AdminService } from '../services/admin.service';
import { AdminListQueryDto } from '../dtos/admin.dto';

@Injectable()
export class GetAgentsUsecase extends Usecase {
  constructor(private readonly adminService: AdminService) {
    super();
  }

  async execute(
    _entityManager: EntityManager,
    args: { query?: AdminListQueryDto },
    _args?: any,
  ) {
    return this.adminService.getAgents(args?.query ?? {});
  }
}
