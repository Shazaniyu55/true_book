import { Injectable, UnauthorizedException } from '@nestjs/common';

import { Admin } from '@modules/core/entities/admin.entity';
import { CreateAdminDto } from '../dtos/create-admin.dto';
import { AdminRepository } from '@adapters/repositories/admin.repository';
import { EntityManager } from 'typeorm';
import { AdminListQueryDto } from '../dtos/admin.dto';
import { LoginAdminDto } from '../dtos/login.dto';
import { HashingUtil } from '@shared/utils/hashing/hashing.utils';
import { UserStatus } from 'src/types/enums';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { EmailService } from '@modules/email/email.service';
import { RandomnessUtil } from '@shared/utils/encryption/randomness.util';
import { getOtpExpiry, isOtpExpired } from '@shared/utils/helpers/common.utils';

@Injectable()
export class AdminService {
  constructor(
    private readonly adminRepo: AdminRepository,
    private readonly hashingUtil: HashingUtil,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
    private readonly randomnessUtil: RandomnessUtil,
    private readonly configService: ConfigService,
  ) {}

  async createAdmin(dto: CreateAdminDto, entityManager?: EntityManager): Promise<Admin> {
    const existingUser = await this.adminRepo.findByEmail(dto.email);

    if (existingUser) {
      throw new Error('Email already in use');
    }

    const hashedPassword = await this.hashingUtil.hash(dto.password);
        const otp = this.randomnessUtil.generateOtp();
        await this.emailService.sendOtp({ to: dto.email, firstName: dto.firstName, otp });
            await this.emailService.sendWelcome({ to: dto.email, firstName: dto.firstName, role: dto.roleName });

       const otpExpiresAt = getOtpExpiry(this.configService.get<number>('common.otp.durationMinutes'));
        
    const user = await this.adminRepo.createAdmin(
      {
        ...dto,
        password: hashedPassword,
        otpCode: otp,
        otpExpiresAt,
        status: UserStatus.PENDING,
      },
      entityManager,
    );

   

    return user;
  }

  async loginAdmin(
    dto: LoginAdminDto,
  ): Promise<{ user: Admin; accessToken: string; refreshToken: string }> {
    const user = await this.adminRepo.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const isPasswordValid = await this.hashingUtil.compare(dto.password, user.password);
    if (!isPasswordValid) throw new UnauthorizedException('Invalid credentials');

    if (!user.isEmailVerified) throw new UnauthorizedException('Please verify your email first');

    if (user.status === UserStatus.SUSPENDED)
      throw new UnauthorizedException('Your account has been suspended');

    const tokens = this.generateTokens(user);
    return { user, ...tokens };
  }


    async verifyOtp(email: string, otp: string, entityManager?: EntityManager): Promise<Admin> {
      const user = await this.adminRepo.findByEmail(email);
      if (!user) throw new UnauthorizedException('User not found');
      if (user.otpCode !== otp) throw new UnauthorizedException('Invalid OTP');
      if (isOtpExpired(user.otpExpiresAt)) throw new UnauthorizedException('OTP has expired');
  
      return this.adminRepo.updateUser(
        user.id,
        { isEmailVerified: true, status: UserStatus.ACTIVE, otpCode: null, otpExpiresAt: null },
        entityManager,
      );
    }

  async getDashboardStats() {
    return await this.adminRepo.getDashboardStats();
  }

  async listUsers(query: AdminListQueryDto) {
    return await this.adminRepo.listUsers(query);
  }

  async getUser(id: string) {
    return await this.adminRepo.getUser(id);
  }

  async suspendUser(id: string, reason?: string) {
    return await this.adminRepo.suspendUser(id, reason);
  }

  async activateUser(id: string) {
    return await this.adminRepo.activateUser(id);
  }

  async listPendingDocuments() {
    return await this.adminRepo.listPendingDocuments();
  }

  async reviewDocument(documentId: string, approve: boolean, reason?: string, email?: string) {
    return await this.adminRepo.reviewDocument(documentId, approve, reason, email);
  }

  async approveDocument(documentId: string, email: string) {
    return await this.adminRepo.approveDocument(documentId, email);
  }

  async rejectDocument(documentId: string, reason: string, email: string) {
    return await this.adminRepo.rejectDocument(documentId, reason, email);
  }

  async listTrips(query: AdminListQueryDto) {
    return await this.adminRepo.listTrips(query);
  }

  async getTrip(id: string) {
    return await this.adminRepo.getTrip(id);
  }

  async listBookings(query: AdminListQueryDto) {
    return await this.adminRepo.listBookings(query);
  }

  async getBooking(id: string) {
    return await this.adminRepo.getBooking(id);
  }

  async refundBooking(bookingId: string, reason: string) {
    return await this.adminRepo.refundBooking(bookingId, reason);
  }

  async listPayouts(query: AdminListQueryDto) {
    return await this.adminRepo.listPayouts(query);
  }

  async approvePayout(payoutId: string, email: string) {
    return await this.adminRepo.approvePayout(payoutId, email);
  }

  async declinePayout(payoutId: string, reason: string, email: string) {
    return await this.adminRepo.declinePayout(payoutId, reason, email);
  }

  async listCoupons() {
    return await this.adminRepo.listCoupons();
  }

  async createCoupon(dto: any) {
    return await this.adminRepo.createCoupon(dto);
  }

  async deactivateCoupon(couponId: string) {
    return await this.adminRepo.deactivateCoupon(couponId);
  }

  generateTokens(user: Admin): { accessToken: string; refreshToken: string } {
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
