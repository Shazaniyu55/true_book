import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Broker } from '@broker/broker';
import { Public } from '@shared/decorators/isPublic.decorator';
import { RegisterDto, RegisterPassangerDto } from '../dtos/register.dto';
import { LoginDto } from '../dtos/login.dto';
import { VerifyOtpDto, ResendOtpDto , VerifyPhoneDto, ResendPhoneOtpDto} from '../dtos/verify-otp.dto';
import { ForgotPasswordDto, ResetPassowrdDto } from '../dtos/reset-password.dto';
import { RegisterUsecase } from '../usecases/register.usecase';
import { LoginUsecase } from '../usecases/login.usecase';
import { VerifyOtpUsecase } from '../usecases/verify-otp.usecase';
import { ForgotPasswordUsecase } from '../usecases/forgot-password.usecase';
import { ResetPasswordUsecase } from '../usecases/reset-password.usecase';
import { ServiceName } from '@shared/decorators/servicename.decorators';
import { ResendOtpUsecase } from '../usecases/resendotp.usecase';
import { VerifyPhoneOtpUsecase } from '../usecases/verifyphone-otp.usecase';
import { ResendPhoneOtpUsecase } from '../usecases/resendphoneotp.usecase';

@ApiTags('Auth')
@ServiceName('auth')
@Controller('v1/auth')
export class AuthController {
  constructor(
    private readonly broker: Broker,
    private readonly registerUsecase: RegisterUsecase,
    private readonly loginUsecase: LoginUsecase,
    private readonly verifyOtpUsecase: VerifyOtpUsecase,
    private readonly forgotPasswordUsecase: ForgotPasswordUsecase,
    private readonly resetPasswordUsecase: ResetPasswordUsecase,
    private readonly resendotpUsecase: ResendOtpUsecase,
    private readonly verifyphoneUsecase: VerifyPhoneOtpUsecase,
    private readonly resendPhoneOtpUsecase:ResendPhoneOtpUsecase
  ) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new a new user' })
  register(@Body() dto: RegisterDto) {
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
  @Post('verify-phone-otp')
  @ApiOperation({ summary: 'Verify phone OTP' })
  verifyPhoneOtp(@Body() dto: VerifyPhoneDto) {
    return this.broker.runUsecases([this.verifyphoneUsecase], dto);
  }

  @Public()
  @Post('resend-otp')
  @ApiOperation({ summary: 'Resend OTP' })
  resendOtp(@Body() dto: ResendOtpDto) {
    return this.broker.runUsecases(
      [
       this.resendotpUsecase
      ],
      dto,
    );
  }

  @Public()
  @Post('resend-phone-otp')
  @ApiOperation({ summary: 'Resend phone OTP' })
  resendPhoneOtp(@Body() dto: ResendPhoneOtpDto) {
    return this.broker.runUsecases(
      [
       this.resendPhoneOtpUsecase
      ],
      dto,
    );
  }

  @Public()
  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset OTP' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.broker.runUsecases([this.forgotPasswordUsecase], dto);
  }

  @Public()
  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password ' })
  resetPassword(@Body() dto: ResetPassowrdDto) {
    return this.broker.runUsecases([this.resetPasswordUsecase], dto);
  }
}
