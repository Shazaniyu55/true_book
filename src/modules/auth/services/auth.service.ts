import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { EntityManager } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UserRepository } from '@adapters/repositories/user.repository';
import { PassengerRepository } from '@adapters/repositories/passenger.repository';
import { DriverRepository } from '@adapters/repositories/driver.repository';
import { RandomnessUtil } from '@shared/utils/encryption/randomness.util';
import { User } from '@modules/core/entities/user.entity';
import { UserRole, UserStatus } from '../../../types/enums';
import { getOtpExpiry, isOtpExpired } from '@shared/utils/helpers/common.utils';
import { RegisterDto } from '../dtos/register.dto';
import { LoginDto } from '../dtos/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passengerRepository: PassengerRepository,
    private readonly driverRepository: DriverRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly randomnessUtil: RandomnessUtil,
  ) {}

  async register(dto: RegisterDto, entityManager?: EntityManager): Promise<User> {
    const existingUser = await this.userRepository.findByEmail(dto.email);
    if (existingUser) throw new ConflictException('Email already in use');

    const existingPhone = await this.userRepository.findByPhone(dto.phone);
    if (existingPhone) throw new ConflictException('Phone number already in use');

    const hashedPassword = await bcrypt.hash(dto.password, 12);
    const referralCode = this.randomnessUtil.generateRandomStringWithNumbers(8);
    const otp = this.randomnessUtil.generateOtp();
    const otpExpiresAt = getOtpExpiry(this.configService.get<number>('common.otp.durationMinutes'));

    const user = await this.userRepository.createUser(
      {
        ...dto,
        password: hashedPassword,
        referralCode,
        otpCode: otp,
        otpExpiresAt,
        role: dto.role || UserRole.PASSENGER,
        status: UserStatus.PENDING,
      },
      entityManager,
    );

    // Create role-specific profile
    if (user.role === UserRole.PASSENGER) {
      await this.passengerRepository.createPassenger({ userId: user.id }, entityManager);
    } else if (user.role === UserRole.DRIVER) {
      await this.driverRepository.createDriver({ userId: user.id }, entityManager);
    }

    // TODO: Send OTP via notification service
    return user;
  }

  async login(dto: LoginDto): Promise<{ user: User; accessToken: string; refreshToken: string }> {
    const user = await this.userRepository.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) throw new UnauthorizedException('Invalid credentials');

    if (!user.isEmailVerified) throw new UnauthorizedException('Please verify your email first');

    if (user.status === UserStatus.SUSPENDED)
      throw new UnauthorizedException('Your account has been suspended');

    const tokens = this.generateTokens(user);
    return { user, ...tokens };
  }

  async verifyOtp(email: string, otp: string, entityManager?: EntityManager): Promise<User> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) throw new BadRequestException('User not found');
    if (user.otpCode !== otp) throw new BadRequestException('Invalid OTP');
    if (isOtpExpired(user.otpExpiresAt)) throw new BadRequestException('OTP has expired');

    return this.userRepository.updateUser(
      user.id,
      { isEmailVerified: true, status: UserStatus.ACTIVE, otpCode: null, otpExpiresAt: null },
      entityManager,
    );
  }

  async resendOtp(email: string, entityManager?: EntityManager): Promise<void> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) throw new BadRequestException('User not found');
    if (user.isEmailVerified) throw new BadRequestException('Email already verified');

    const otp = this.randomnessUtil.generateOtp();
    const otpExpiresAt = getOtpExpiry(this.configService.get<number>('common.otp.durationMinutes'));

    await this.userRepository.updateUser(user.id, { otpCode: otp, otpExpiresAt }, entityManager);
    // TODO: send OTP via notification service
  }

  async forgotPassword(email: string, entityManager?: EntityManager): Promise<void> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) return; // Don't reveal if email exists

    const otp = this.randomnessUtil.generateOtp();
    const otpExpiresAt = getOtpExpiry(this.configService.get<number>('common.otp.durationMinutes'));
    await this.userRepository.updateUser(user.id, { otpCode: otp, otpExpiresAt }, entityManager);
    // TODO: send reset OTP via notification service
  }

  async resetPassword(email: string, otp: string, newPassword: string, entityManager?: EntityManager): Promise<void> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) throw new BadRequestException('User not found');
    if (user.otpCode !== otp) throw new BadRequestException('Invalid OTP');
    if (isOtpExpired(user.otpExpiresAt)) throw new BadRequestException('OTP has expired');

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await this.userRepository.updateUser(
      user.id,
      { password: hashedPassword, otpCode: null, otpExpiresAt: null },
      entityManager,
    );
  }

  generateTokens(user: User): { accessToken: string; refreshToken: string } {
    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('common.auth.jwt.accessSecret'),
      expiresIn: this.configService.get<string>('common.auth.jwt.accessExpiresIn'),
    });
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('common.auth.jwt.refreshSecret'),
      expiresIn: this.configService.get<string>('common.auth.jwt.refreshExpiresIn'),
    });
    return { accessToken, refreshToken };
  }
}
