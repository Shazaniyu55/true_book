import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';

import { VerifyOtpDto } from '@modules/auth/dtos/verify-otp.dto';
import { AuthService } from '../services/auth.service';

@Injectable()
export class VerifyAdminOtpUsecase extends Usecase {
  constructor(private readonly authService: AuthService) {
    super();
  }

  async execute(_entityManager: EntityManager, args: VerifyOtpDto) {
    return this.authService.verifyAdminOtp(args.email, args.otp, _entityManager);
  }
}
