import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { AuthService } from '../services/auth.service';
import { VerifyPhoneDto } from '../dtos/verify-otp.dto';

@Injectable()
export class VerifyPhoneOtpUsecase extends Usecase {
  constructor(private readonly authService: AuthService) { super(); }

  async execute(entityManager: EntityManager, args: VerifyPhoneDto) {
    const user = await this.authService.verifyPhoneOtp(args.phone, args.otp, entityManager);
    return { user };
  }
}
