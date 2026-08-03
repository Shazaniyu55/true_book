import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { AdminService } from '../services/admin.service';
import { UploadDriverDocumentDto } from '../dtos/adddoc.dto';

@Injectable()
export class AddDriverDocUsecase extends Usecase {
  constructor(private readonly adminService: AdminService) {
    super();
  }

  async execute(
    _entityManager: EntityManager,
    args: { id: string; dto: UploadDriverDocumentDto; file?: Express.Multer.File },
  ) {
    return this.adminService.addDriverDocumentFile(args.id, args.dto, args.file);
  }
}