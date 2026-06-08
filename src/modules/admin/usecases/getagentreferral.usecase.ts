import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { AdminService } from '../services/admin.service';
import { AdminListQueryDto } from '../dtos/admin.dto';

@Injectable()
export class GetAgentReferralUsecase extends Usecase {
  constructor(private readonly adminService: AdminService) {
    super();
  }

  async execute(_entityManager: EntityManager, args: {id:string, query:AdminListQueryDto}) {
    return this.adminService.getAgentReferrals(args.id, args.query);
  }
}