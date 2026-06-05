import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';

import { Admin } from '@modules/core/entities/admin.entity';
import { AdminRepository } from '@adapters/repositories/admin.repository';
import { EntityManager, Repository } from 'typeorm';
import { AdminListQueryDto, UpdateAdminProfileDto, UpdateDriverDocumentDto } from '../dtos/admin.dto';
import { HashingUtil } from '@shared/utils/hashing/hashing.utils';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { EmailService } from '@modules/email/email.service';
import { RandomnessUtil } from '@shared/utils/encryption/randomness.util';
import { Role } from '@modules/core/entities/role.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { CloudinaryService } from '@modules/cloudinary/services/cloudinary.service';
import { UpdatePasswordDto } from '../dtos/updatePassword.dto';
import { AddDriverDocumentsDto } from '../dtos/adddoc.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly adminRepo: AdminRepository,
    private readonly hashingUtil: HashingUtil,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
    private readonly randomnessUtil: RandomnessUtil,
    private readonly configService: ConfigService,
    private readonly cloudinaryService: CloudinaryService,

    @InjectRepository(Role)
  private readonly roleRepository: Repository<Role>
  ) {}


  async getDashboardStats(query: { page?: number; limit?: number }) {
    return await this.adminRepo.getDashboardStats(query);
  }

  async getDrivers(query: {
  page?: number;
  limit?: number;
  search?: string;
  kycStatus?: string;
  status?: string;
}){
    return await this.adminRepo.getDrivers(query)
  }

  async getDriverById(id: string){
    return await this.adminRepo.getDriverById(id)
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

  async activateDriver(id: string){
    return await this.adminRepo.activateDriver(id);
  }

  async getDriverDocHistory(id: string){
    return await this.adminRepo.getDriverDocumentHistory(id);
  }

  async updateDriverDocuments(id: string, dto:UpdateDriverDocumentDto){
    return await this.adminRepo.updateDriverDocuments(id, dto)
  }
  
  async addDriverDocuments(id: string, dto: AddDriverDocumentsDto){
    return await this.adminRepo.addDriverDocuments(id, dto)
  }

  async deleteDriverDocHistory(id: string){
    return await this.adminRepo.deleteDriverDocumentHistory(id); 
  }

 async updateProfile(
    id: string,
    dto: UpdateAdminProfileDto,
    file?: Express.Multer.File,
    entityManager?: EntityManager,
  ) {
    if (file) {
      const uploaded = await this.cloudinaryService.upload(file, {
        folder: `admin/${id}/profile`,
        resource_type: 'image',
      });
      dto.profilePhoto = uploaded.secure_url; // repository maps this onto User.profilePhoto
    }
    return this.adminRepo.updateUser(id, dto, entityManager);
  }

  async getProfile(id: string) {
    return await this.adminRepo.getProfile(id);
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

  async updatePassword(
  adminId: string,
  dto:UpdatePasswordDto,

): Promise<{ message: string }> {
  const admin = await this.adminRepo.findByIdWithPassword(adminId);

  const isMatch = await this.hashingUtil.compare(dto.currentPassword, admin.password);
  if (!isMatch) throw new BadRequestException('Current password is incorrect');

  const isSame = await this.hashingUtil.compare(dto.newPassword, admin.password);
  if (isSame)
    throw new BadRequestException(
      'New password must be different from the current password',
    );

  const hashed = await this.hashingUtil.hash(dto.newPassword);
  return this.adminRepo.updatePassword(adminId, hashed);
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
