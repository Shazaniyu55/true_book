import { Body, Controller, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Broker } from '@broker/broker';
import { Public } from '@shared/decorators/isPublic.decorator';
import { RegisterDto } from '../dtos/register.dto';
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
import { RegisterAdminUsecase } from '../usecases/createadmin.usecase';
import { CreateAdminDto } from '@modules/admin/dtos/create-admin.dto';
import { LoginAdminDto } from '@modules/admin/dtos/login.dto';
import { LoginAdminUsecase } from '../usecases/loginadmin.usecase';
import { VerifyAdminOtpUsecase } from '../usecases/verifyadminotp.usecase';
import { Throttle } from '@nestjs/throttler';


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
    private readonly resendPhoneOtpUsecase:ResendPhoneOtpUsecase,
    private readonly registerAdminUsecase: RegisterAdminUsecase,
    private readonly loginAdminUsecase: LoginAdminUsecase,
    private readonly verifyAdminOtpUsecase: VerifyAdminOtpUsecase
  ) {}

  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new a new user' })
  register(@Body() dto: RegisterDto) {
    return this.broker.runUsecases([this.registerUsecase], dto);
  }

    @Throttle({ default: { ttl: 60_000, limit: 5 } })
    @Post('register-admin')
    @ApiOperation({ summary: 'Create a new admin' })
    @ApiBody({ type: CreateAdminDto })
    createAdmin(@Body() dto: CreateAdminDto) {
      return this.broker.runUsecases([this.registerAdminUsecase], dto);
    }
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('login-admin')
  @ApiOperation({ summary: 'Admin login' })
  @ApiBody({ type: LoginAdminDto })
  loginAdmin(@Body() dto: LoginAdminDto) {
    return this.broker.runUsecases([this.loginAdminUsecase], dto);
  }

  @Throttle({ default: { ttl: 60_000, limit: 5 } })
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

    @Post('verify-admin-otp')
    @ApiOperation({summary: 'verify admin otp'})
    @ApiBody({type: VerifyOtpDto})
    verifyAdminOtp(@Body() dto: VerifyOtpDto){
      return this.broker.runUsecases([this.verifyAdminOtpUsecase], dto)
  
    }

  @Public()
  @Post('verify-phone-otp')
  @ApiOperation({ summary: 'Verify phone OTP' })
  verifyPhoneOtp(@Body() dto: VerifyPhoneDto) {
    return this.broker.runUsecases([this.verifyphoneUsecase], dto);
  }

  @Throttle({ default: { ttl: 60_000, limit: 5 } })
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

  @Throttle({ default: { ttl: 60_000, limit: 5 } })
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

  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Public()
  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset OTP' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.broker.runUsecases([this.forgotPasswordUsecase], dto);
  }

  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Public()
  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password ' })
  resetPassword(@Body() dto: ResetPassowrdDto) {
    return this.broker.runUsecases([this.resetPasswordUsecase], dto);
  }


}
