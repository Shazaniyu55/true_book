import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { AuthService } from '../services/auth.service';
import { ResetPassowrdDto } from '../dtos/reset-password.dto';

@Injectable()
export class ResetPasswordUsecase extends Usecase {
  constructor(private readonly authService: AuthService) { super(); }

  async execute(entityManager: EntityManager, args: ResetPassowrdDto) {
    await this.authService.resetPassword(args.email, args.otp, args.password, entityManager);
    return { message: 'Password reset successful' };
  }
}
