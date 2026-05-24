import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { AdminService } from '../services/admin.service';
import { AdminListQueryDto } from '../dtos/admin.dto';

@Injectable()
export class ListBookingsUsecase extends Usecase {
  constructor(private readonly adminService: AdminService) {
    super();
  }

  async execute(_entityManager: EntityManager, args: AdminListQueryDto) {
    return this.adminService.listBookings(args);
  }
}

@Injectable()
export class GetBookingUsecase extends Usecase {
  constructor(private readonly adminService: AdminService) {
    super();
  }

  async execute(_entityManager: EntityManager, args: { id: number }) {
    return this.adminService.getBooking(args.id);
  }
}

@Injectable()
export class RefundBookingUsecase extends Usecase {
  constructor(private readonly adminService: AdminService) {
    super();
  }

  async execute(
    _entityManager: EntityManager,
    args: { id: number; adminEmail: string },
  ) {
    return this.adminService.refundBooking(args.id, args.adminEmail);
  }
}