import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { AdminService } from '../services/admin.service';
import { UpdateDriverDocumentDto } from '../dtos/admin.dto';

@Injectable()
export class UpdateDriverDocUsecase extends Usecase {
  constructor(private readonly adminService: AdminService) {
    super();
  }

  async execute(_entityManager: EntityManager,  args: {id: string, dto: UpdateDriverDocumentDto}) {
    return this.adminService.updateDriverDocuments(args.id, args.dto);
  }
}