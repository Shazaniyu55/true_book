import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { AdminService } from '../services/admin.service';
import { LoginAdminDto } from '../dtos/login.dto';
import { VerifyOtpDto } from '@modules/auth/dtos/verify-otp.dto';

@Injectable()
export class VerifyAdminOtpUsecase extends Usecase {
  constructor(private readonly adminService: AdminService) {
    super();
  }

  async execute(_entityManager: EntityManager, args: VerifyOtpDto) {
    return this.adminService.verifyOtp(args.email, args.otp, _entityManager);
  }
}
