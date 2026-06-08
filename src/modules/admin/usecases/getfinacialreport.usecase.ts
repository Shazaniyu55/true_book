import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { AdminService } from '../services/admin.service';
import { AdminListQueryDto } from '../dtos/admin.dto';

@Injectable()
export class GetFinacialReportUsecase extends Usecase {
  constructor(private readonly adminService: AdminService) {
    super();
  }

  async execute(_entityManager: EntityManager, args: { query:AdminListQueryDto}) {
    return this.adminService.getFinancialReport(args.query);
  }
}