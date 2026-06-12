import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { AdminService } from '../services/admin.service';
import { CreateSubAdminDto } from '../dtos/create-subadmin.dto';

@Injectable()
export class CreateSubAdminUsecase extends Usecase {
  constructor(private readonly adminService: AdminService) {
    super();
  }

  async execute(
    _entityManager: EntityManager,
    args: { creatorId: string; dto: CreateSubAdminDto },
  ) {
    return this.adminService.createSubAdmin(args.creatorId, args.dto);
  }
}