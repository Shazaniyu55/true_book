import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { AuthService } from '../services/auth.service';
import { LoginDto } from '../dtos/login.dto';

@Injectable()
export class LoginUsecase extends Usecase {
  constructor(private readonly authService: AuthService) { super(); }

  async execute(_entityManager: EntityManager, args: LoginDto) {
    return this.authService.login(args);
  }
}
