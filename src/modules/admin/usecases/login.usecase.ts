import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { AdminService } from '../services/admin.service';
import { Admin } from '../../core/entities/admin.entity';
import { LoginAdminDto } from '../dtos/login.dto';


@Injectable()
export class LoginAdminUsecase extends Usecase {
  constructor(private readonly adminService: AdminService) { super(); }

  async execute(_entityManager: EntityManager, args: LoginAdminDto) {
    return this.adminService.loginAdmin(args);
  }
}