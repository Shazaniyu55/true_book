import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { AdminService } from '../services/admin.service';
import { CreateCouponDto } from '../dtos/admin.dto';

@Injectable()
export class ListCouponsUsecase extends Usecase {
  constructor(private readonly adminService: AdminService) {
    super();
  }

  async execute(_entityManager: EntityManager, _args: any) {
    return this.adminService.listCoupons();
  }
}

@Injectable()
export class CreateCouponUsecase extends Usecase {
  constructor(private readonly adminService: AdminService) {
    super();
  }

  async execute(
    _entityManager: EntityManager,
    args: CreateCouponDto & { adminId: string },
  ) {
    return this.adminService.createCoupon(args);
  }
}

@Injectable()
export class DeactivateCouponUsecase extends Usecase {
  constructor(private readonly adminService: AdminService) {
    super();
  }

  async execute(_entityManager: EntityManager, args: { id: string }) {
    return this.adminService.deactivateCoupon(args.id);
  }
}