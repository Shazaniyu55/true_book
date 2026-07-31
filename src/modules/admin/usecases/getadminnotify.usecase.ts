import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { AdminService } from '../services/admin.service';
import { AdminNotificationActivityQuery } from 'src/types/enums';

@Injectable()
export class GetAdminNotificationActivityUseCase extends Usecase {
  constructor(private readonly adminService: AdminService) {
    super();
  }

  async execute(_entityManager: EntityManager, query:AdminNotificationActivityQuery) {
    return this.adminService.getAdminNotificationActivity(query);
  }
}