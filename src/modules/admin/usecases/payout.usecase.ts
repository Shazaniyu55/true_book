import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { AdminService } from '../services/admin.service';
import { AdminListQueryDto } from '../dtos/admin.dto';

@Injectable()
export class ListPayoutsUsecase extends Usecase {
  constructor(private readonly adminService: AdminService) {
    super();
  }

  async execute(_entityManager: EntityManager, args: AdminListQueryDto) {
    return this.adminService.listPayouts(args);
  }
}

@Injectable()
export class ApprovePayoutUsecase extends Usecase {
  constructor(private readonly adminService: AdminService) {
    super();
  }

  async execute(
    _entityManager: EntityManager,
    args: { id: string; adminEmail: string },
  ) {
    return this.adminService.approvePayout(args.id, args.adminEmail);
  }
}

@Injectable()
export class DeclinePayoutUsecase extends Usecase {
  constructor(private readonly adminService: AdminService) {
    super();
  }

  async execute(
    _entityManager: EntityManager,
    args: { id: string; reason: string; adminEmail: string },
  ) {
    return this.adminService.declinePayout(args.id, args.reason, args.adminEmail);
  }
}