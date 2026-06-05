import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { AdminService } from '../services/admin.service';
import { AddDriverDocumentsDto } from '../dtos/adddoc.dto';

@Injectable()
export class AddDriverDocUsecase extends Usecase {
  constructor(private readonly adminService: AdminService) {
    super();
  }

  async execute(_entityManager: EntityManager,  args: {id: string, dto: AddDriverDocumentsDto}) {
    return this.adminService.addDriverDocuments(args.id, args.dto);
  }
}