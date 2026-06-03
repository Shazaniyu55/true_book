import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';

import { Admin } from '@modules/core/entities/admin.entity';
import { CreateAdminDto } from '../dtos/create-admin.dto';
import { AdminRepository } from '@adapters/repositories/admin.repository';
import { EntityManager, Repository } from 'typeorm';
import { AdminListQueryDto } from '../dtos/admin.dto';
import { LoginAdminDto } from '../dtos/login.dto';
import { HashingUtil } from '@shared/utils/hashing/hashing.utils';
import { UserStatus } from 'src/types/enums';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { EmailService } from '@modules/email/email.service';
import { RandomnessUtil } from '@shared/utils/encryption/randomness.util';
import { getOtpExpiry, isOtpExpired } from '@shared/utils/helpers/common.utils';
import { Role } from '@modules/core/entities/role.entity';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class AdminService {
  constructor(
    private readonly adminRepo: AdminRepository,
    private readonly hashingUtil: HashingUtil,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
    private readonly randomnessUtil: RandomnessUtil,
    private readonly configService: ConfigService,

    @InjectRepository(Role)
  private readonly roleRepository: Repository<Role>
  ) {}






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

  async listPendingDocuments(query: AdminListQueryDto) {
    return await this.adminRepo.listPendingDocuments(query);
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

  async listCoupons(query: AdminListQueryDto) {
    return await this.adminRepo.listCoupons(query);
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
