import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { AuthService } from '../services/auth.service';
import { VerifyOtpDto } from '../dtos/verify-otp.dto';

@Injectable()
export class VerifyOtpUsecase extends Usecase {
  constructor(private readonly authService: AuthService) { super(); }

  async execute(entityManager: EntityManager, args: VerifyOtpDto) {
    const user = await this.authService.verifyOtp(args.email, args.otp, entityManager);
    return { user };
  }
}
