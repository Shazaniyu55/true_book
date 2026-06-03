import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { AuthService } from '../services/auth.service';
import { LoginAdminDto } from '@modules/admin/dtos/login.dto';

@Injectable()
export class LoginAdminUsecase extends Usecase {
  constructor(private readonly authService: AuthService) {
    super();
  }

  async execute(_entityManager: EntityManager, args: LoginAdminDto) {
    return this.authService.loginAdmin(args);
  }
}
