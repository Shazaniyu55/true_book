import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { AdminService } from '../services/admin.service';
import { AdminListQueryDto } from '../dtos/admin.dto';

@Injectable()
export class ListPendingVehiclesUsecase extends Usecase {
  constructor(private readonly adminService: AdminService) {
    super();
  }

  async execute(_entityManager: EntityManager, args: AdminListQueryDto) {
    return this.adminService.listPendingVehicles(args);
  }
}

@Injectable()
export class ApproveVehicleUsecase extends Usecase {
  constructor(private readonly adminService: AdminService) {
    super();
  }

  async execute(
    _entityManager: EntityManager,
    args: { id: string; adminEmail: string },
  ) {
    return this.adminService.approveVehicle(args.id, args.adminEmail);
  }
}

@Injectable()
export class RejectVehicleUsecase extends Usecase {
  constructor(private readonly adminService: AdminService) {
    super();
  }

  async execute(
    _entityManager: EntityManager,
    args: { id: string; reason: string; adminEmail: string },
  ) {
    return this.adminService.rejectVehicle(args.id, args.reason, args.adminEmail);
  }
}