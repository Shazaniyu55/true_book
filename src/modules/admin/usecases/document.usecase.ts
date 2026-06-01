import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { AdminService } from '../services/admin.service';
import { AdminListQueryDto } from '../dtos/admin.dto';

@Injectable()
export class ListPendingDocumentsUsecase extends Usecase {
  constructor(private readonly adminService: AdminService) {
    super();
  }

  async execute(_entityManager: EntityManager,args: AdminListQueryDto) {
    return this.adminService.listPendingDocuments(args);
  }
}

@Injectable()
export class ApproveDocumentUsecase extends Usecase {
  constructor(private readonly adminService: AdminService) {
    super();
  }

  async execute(
    _entityManager: EntityManager,
    args: { id: string; adminEmail: string },
  ) {
    return this.adminService.approveDocument(args.id, args.adminEmail);
  }
}

@Injectable()
export class RejectDocumentUsecase extends Usecase {
  constructor(private readonly adminService: AdminService) {
    super();
  }

  async execute(
    _entityManager: EntityManager,
    args: { id: string; reason: string; adminEmail: string },
  ) {
    return this.adminService.rejectDocument(args.id, args.reason, args.adminEmail);
  }
}