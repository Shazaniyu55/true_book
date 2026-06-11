import { describe, it, expect, beforeEach } from '@jest/globals';

import { Test } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

import { AuthService } from '@modules/auth/services/auth.service';
import { UserRepository } from '@adapters/repositories/user.repository';
import { PassengerRepository } from '@adapters/repositories/passenger.repository';
import { DriverRepository } from '@adapters/repositories/driver.repository';
import { AdminRepository } from '@adapters/repositories/admin.repository';
import { AgentRepository } from '@adapters/repositories/agent.repository';
import { HashingUtil } from '@shared/utils/hashing/hashing.utils';
import { RandomnessUtil } from '@shared/utils/encryption/randomness.util';
import { EmailService } from '@modules/email/email.service';
import { ExpoService } from '@modules/notification/services/expo.service';
import { ReferralService } from '@modules/coupon-referral/service/referal.service';
import { CouponService } from '@modules/coupon-referral/service/cupon.service';
import { DojahAdapter } from '@adapters/kyc/dojah/dojah.adapter';
import { Role } from '@modules/core/entities/role.entity';
import { UserStatus } from 'src/types/enums';

/**
 * Pure unit test: every collaborator is a mock, so this exercises only the
 * branching logic inside AuthService.login (and generateTokens).
 */
describe('AuthService.login', () => {
  let service: AuthService;

  const userRepo = { findByEmail: jest.fn() };
  const hashing = { compare: jest.fn(), hash: jest.fn() };
  const jwt = { sign: jest.fn().mockReturnValue('signed-token') };
  const config = { get: jest.fn().mockReturnValue('secret') };

  const verifiedActiveUser = {
    id: 'u1',
    email: 'a@b.com',
    role: 'passenger',
    password: 'hashed',
    isEmailVerified: true,
    isPhoneVerified: true,
    status: UserStatus.ACTIVE,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserRepository, useValue: userRepo },
        { provide: HashingUtil, useValue: hashing },
        { provide: JwtService, useValue: jwt },
        { provide: ConfigService, useValue: config },
        // Unused by login — stubbed so Nest DI can construct the service.
        { provide: PassengerRepository, useValue: {} },
        { provide: DriverRepository, useValue: {} },
        { provide: AdminRepository, useValue: {} },
        { provide: AgentRepository, useValue: {} },
        { provide: RandomnessUtil, useValue: {} },
        { provide: EmailService, useValue: {} },
        { provide: ExpoService, useValue: {} },
        { provide: ReferralService, useValue: {} },
        { provide: CouponService, useValue: {} },
        { provide: DojahAdapter, useValue: {} },
        { provide: getRepositoryToken(Role), useValue: {} },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  const creds = { email: 'a@b.com', password: 'Password123' } as any;

  it('rejects an unknown email', async () => {
    userRepo.findByEmail.mockResolvedValue(null);
    await expect(service.login(creds)).rejects.toThrow(UnauthorizedException);
    await expect(service.login(creds)).rejects.toThrow('Invalid credentials');
  });

  it('rejects a wrong password', async () => {
    userRepo.findByEmail.mockResolvedValue(verifiedActiveUser);
    hashing.compare.mockResolvedValue(false);
    await expect(service.login(creds)).rejects.toThrow('Invalid credentials');
  });

  it('rejects an unverified email', async () => {
    userRepo.findByEmail.mockResolvedValue({ ...verifiedActiveUser, isEmailVerified: false });
    hashing.compare.mockResolvedValue(true);
    await expect(service.login(creds)).rejects.toThrow('Please verify your email first');
  });

  it('rejects an unverified phone', async () => {
    userRepo.findByEmail.mockResolvedValue({ ...verifiedActiveUser, isPhoneVerified: false });
    hashing.compare.mockResolvedValue(true);
    await expect(service.login(creds)).rejects.toThrow('Please verify your phone first');
  });

  it('rejects a suspended account', async () => {
    userRepo.findByEmail.mockResolvedValue({ ...verifiedActiveUser, status: UserStatus.SUSPENDED });
    hashing.compare.mockResolvedValue(true);
    await expect(service.login(creds)).rejects.toThrow('Your account has been suspended');
  });

  it('returns the user plus signed tokens on success', async () => {
    userRepo.findByEmail.mockResolvedValue(verifiedActiveUser);
    hashing.compare.mockResolvedValue(true);

    const result = await service.login(creds);

    expect(result.user).toBe(verifiedActiveUser);
    expect(result.accessToken).toBe('signed-token');
    expect(result.refreshToken).toBe('signed-token');
    expect(jwt.sign).toHaveBeenCalledTimes(2); // access + refresh
  });
});