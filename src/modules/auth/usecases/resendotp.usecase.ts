import { Injectable } from '@nestjs/common';
import { Usecase } from '@broker/types';
import { AuthService } from '../services/auth.service';
import { ResendOtpDto } from '../dtos/verify-otp.dto';
import { EntityManager } from 'typeorm';

@Injectable()
export class ResendOtpUsecase extends Usecase {
  constructor(private readonly authService: AuthService) { super(); }

  async execute(entityManager: EntityManager, args: ResendOtpDto): Promise<{ message: string }> {
    await this.authService.resendOtp(args, entityManager);
    return { message: 'OTP sent successfully' };
  }
}