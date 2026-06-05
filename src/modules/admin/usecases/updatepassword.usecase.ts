import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { AdminService } from '../services/admin.service';
import { UpdatePasswordDto } from '../dtos/updatePassword.dto';

@Injectable()
export class UpdatePasswordUsecase extends Usecase {
  constructor(private readonly adminService: AdminService) {
    super();
  }

  async execute(_entityManager: EntityManager,  args: {id: string, dto: UpdatePasswordDto}) {
    return this.adminService.updatePassword(args.id, args.dto);
  }
}