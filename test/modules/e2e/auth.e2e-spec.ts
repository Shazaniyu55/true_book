import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

import { AuthController } from '@modules/auth/controllers/auth.controller';
import { Broker } from '@broker/broker';
import { ResponseInterceptor } from '@shared/interceptors/response.interceptor';
import { CustomFieldValidationPipe } from '@shared/validations/custom.validation';

import { RegisterUsecase } from '@modules/auth/usecases/register.usecase';
import { LoginUsecase } from '@modules/auth/usecases/login.usecase';
import { VerifyOtpUsecase } from '@modules/auth/usecases/verify-otp.usecase';
import { ForgotPasswordUsecase } from '@modules/auth/usecases/forgot-password.usecase';
import { ResetPasswordUsecase } from '@modules/auth/usecases/reset-password.usecase';
import { ResendOtpUsecase } from '@modules/auth/usecases/resendotp.usecase';
import { VerifyPhoneOtpUsecase } from '@modules/auth/usecases/verifyphone-otp.usecase';
import { ResendPhoneOtpUsecase } from '@modules/auth/usecases/resendphoneotp.usecase';
import { RegisterAdminUsecase } from '@modules/auth/usecases/createadmin.usecase';
import { LoginAdminUsecase } from '@modules/auth/usecases/loginadmin.usecase';
import { VerifyAdminOtpUsecase } from '@modules/auth/usecases/verifyadminotp.usecase';

/**
 * Controller-level e2e. We boot a STANDALONE module with just AuthController so
 * no database or TypeORM wiring is needed — the Broker (which would open a real
 * transaction) is replaced by a mock. This verifies routing, DTO validation, and
 * the global ResponseInterceptor envelope end to end.
 */
describe('Auth controller (e2e)', () => {
  let app: INestApplication;
  const broker = { runUsecases: jest.fn() };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: Broker, useValue: broker },
        // Every usecase the controller injects — stubbed; the broker is mocked
        // so these are never actually executed.
        { provide: RegisterUsecase, useValue: {} },
        { provide: LoginUsecase, useValue: {} },
        { provide: VerifyOtpUsecase, useValue: {} },
        { provide: ForgotPasswordUsecase, useValue: {} },
        { provide: ResetPasswordUsecase, useValue: {} },
        { provide: ResendOtpUsecase, useValue: {} },
        { provide: VerifyPhoneOtpUsecase, useValue: {} },
        { provide: ResendPhoneOtpUsecase, useValue: {} },
        { provide: RegisterAdminUsecase, useValue: {} },
        { provide: LoginAdminUsecase, useValue: {} },
        { provide: VerifyAdminOtpUsecase, useValue: {} },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(CustomFieldValidationPipe);
    app.useGlobalInterceptors(new ResponseInterceptor());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => jest.clearAllMocks());

  it('POST /v1/auth/login wraps the broker result in the success envelope', async () => {
    broker.runUsecases.mockResolvedValue({
      user: { id: 'u1', email: 'a@b.com' },
      accessToken: 'access-abc',
      refreshToken: 'refresh-abc',
    });

    const res = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: 'a@b.com', password: 'Password123' })
      .expect(201); // Nest POST defaults to 201 (no @HttpCode on this route)

    expect(res.body.success).toBe(true);
    expect(res.body.result.accessToken).toBe('access-abc');
    expect(broker.runUsecases).toHaveBeenCalledTimes(1);
  });

  it('POST /v1/auth/login rejects an invalid email with a 400 envelope', async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: 'not-an-email', password: 'Password123' })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(Array.isArray(res.body.errors)).toBe(true);
    expect(broker.runUsecases).not.toHaveBeenCalled();
  });
});


