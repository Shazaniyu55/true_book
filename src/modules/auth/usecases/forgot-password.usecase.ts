import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { AuthService } from '../services/auth.service';

@Injectable()
export class ForgotPasswordUsecase extends Usecase {
  constructor(private readonly authService: AuthService) { super(); }

  async execute(entityManager: EntityManager, args: { email: string }) {
    await this.authService.forgotPassword(args.email, entityManager);
    return { message: 'Password reset OTP sent if email exists' };
  }
}
