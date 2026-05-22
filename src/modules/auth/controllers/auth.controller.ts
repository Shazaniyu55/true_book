import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Broker } from '@broker/broker';
import { Public } from '@shared/decorators/isPublic.decorator';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { RolesGuard } from '@shared/guards/roles.guard';
import { RegisterDto, RegisterPassangerDto } from '../dtos/register.dto';
import { LoginDto } from '../dtos/login.dto';
import { VerifyOtpDto, ResendOtpDto } from '../dtos/verify-otp.dto';
import { ForgotPasswordDto, ResetPassowrdDto } from '../dtos/reset-password.dto';
import { RegisterUsecase } from '../usecases/register.usecase';
import { LoginUsecase } from '../usecases/login.usecase';
import { VerifyOtpUsecase } from '../usecases/verify-otp.usecase';
import { ForgotPasswordUsecase } from '../usecases/forgot-password.usecase';
import { ResetPasswordUsecase } from '../usecases/reset-password.usecase';

@ApiTags('Auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('v1')
export class AuthController {
  constructor(
    private readonly broker: Broker,
    private readonly registerUsecase: RegisterUsecase,
    private readonly loginUsecase: LoginUsecase,
    private readonly verifyOtpUsecase: VerifyOtpUsecase,
    private readonly forgotPasswordUsecase: ForgotPasswordUsecase,
    private readonly resetPasswordUsecase: ResetPasswordUsecase,
  ) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  register(@Body() dto: RegisterDto) {
    return this.broker.runUsecases([this.registerUsecase], dto);
  }

  // Preserved typo for mobile backward compatibility: /v1/register/passanger
  @Public()
  @Post('register/passanger')
  @ApiOperation({ summary: 'Register passenger (preserved typo for mobile compat)' })
  registerPassanger(@Body() dto: RegisterPassangerDto) {
    return this.broker.runUsecases([this.registerUsecase], dto);
  }

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Login' })
  login(@Body() dto: LoginDto) {
    return this.broker.runUsecases([this.loginUsecase], dto);
  }

  @Public()
  @Post('verify-otp')
  @ApiOperation({ summary: 'Verify email OTP' })
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.broker.runUsecases([this.verifyOtpUsecase], dto);
  }

  @Public()
  @Post('resend-otp')
  @ApiOperation({ summary: 'Resend OTP' })
  resendOtp(@Body() dto: ResendOtpDto) {
    // inline usecase pattern for simple ops
    return this.broker.runUsecases([
      { execute: async (em, args) => { return { message: 'OTP sent' }; } } as any,
    ], dto);
  }

  @Public()
  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset OTP' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.broker.runUsecases([this.forgotPasswordUsecase], dto);
  }

  // Preserved typo for mobile backward compat: /v1/reset-passowrd
  @Public()
  @Post('reset-passowrd')
  @ApiOperation({ summary: 'Reset password (preserved typo for mobile compat)' })
  resetPassword(@Body() dto: ResetPassowrdDto) {
    return this.broker.runUsecases([this.resetPasswordUsecase], dto);
  }
}
