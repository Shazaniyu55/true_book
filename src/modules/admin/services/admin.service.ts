import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

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

@Injectable()
export class AdminService {
  constructor(
   private readonly adminRepo: AdminRepository,
   private readonly hashingUtil: HashingUtil,
   private readonly jwtService: JwtService,
   
      private readonly configService: ConfigService,
  

  
  ) {}

async createAdmin(dto: CreateAdminDto, entityManager?: EntityManager): Promise<Admin> {
         const existingUser = await this.adminRepo.findByEmail(dto.email);

    if (existingUser) {
      throw new Error('Email already in use');
     }

     const hashedPassword = await this.hashingUtil.hash(dto.password);
       const user = await this.adminRepo.createAdmin(
           {
             ...dto,
             password: hashedPassword,
             status: UserStatus.PENDING,
           },
           entityManager,
         );

        return user;
  }

  async loginAdmin(dto: LoginAdminDto): Promise<{ user: Admin; accessToken: string; refreshToken: string }>  {
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

  async getDashboardStats() {
    return await this.adminRepo.getDashboardStats();
  }

 async listUsers(query: AdminListQueryDto) {
    return await this.adminRepo.listUsers(query);
  }

  async getUser(id: number) {
    return await this.adminRepo.getUser(id);
  }

  async suspendUser(id: number, reason?: string) {
    return await this.adminRepo.suspendUser(id, reason);
  }

  async activateUser(id: number) {
    return await this.adminRepo.activateUser(id);
  }

  async listPendingDocuments() {
    return await this.adminRepo.listPendingDocuments();
  }

  async reviewDocument(documentId: number, approve: boolean, reason?: string, email?:string) {
    return await this.adminRepo.reviewDocument(documentId, approve, reason, email);
  }

  async approveDocument(documentId: number, email: string) {
    return await this.adminRepo.approveDocument(documentId, email);
  }

  async rejectDocument(documentId: number, reason: string, email:string) {
    return await this.adminRepo.rejectDocument(documentId, reason, email);
  }

  async listTrips(query: AdminListQueryDto) {
    return await this.adminRepo.listTrips(query); 
  }

  async getTrip(id: number) {
    return await this.adminRepo.getTrip(id);
  }

  async listBookings(query: AdminListQueryDto) {
    return await this.adminRepo.listBookings(query);
  }

  async getBooking(id: number) {
    return await this.adminRepo.getBooking(id);
  }

  async refundBooking(bookingId: number, reason: string) {
    return await this.adminRepo.refundBooking(bookingId, reason);
  }

  async listPayouts(query: AdminListQueryDto) {
    return await this.adminRepo.listPayouts(query);
  }

  async approvePayout(payoutId: number, email: string) {
    return await this.adminRepo.approvePayout(payoutId, email);
  }

  async declinePayout(payoutId: number, reason: string, email: string) {
    return await this.adminRepo.declinePayout(payoutId, reason, email);
  }

  async listCoupons(query: AdminListQueryDto) {
    return await this.adminRepo.listCoupons(query);
  }

  async createCoupon(dto: any) {
    return await this.adminRepo.createCoupon(dto);
  }

  async deactivateCoupon(couponId: number) {
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
