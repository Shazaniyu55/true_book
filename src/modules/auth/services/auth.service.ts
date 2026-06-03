import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { EntityManager, Repository } from 'typeorm';
import { UserRepository } from '@adapters/repositories/user.repository';
import { PassengerRepository } from '@adapters/repositories/passenger.repository';
import { DriverRepository } from '@adapters/repositories/driver.repository';
import { RandomnessUtil } from '@shared/utils/encryption/randomness.util';
import { User } from '@modules/core/entities/user.entity';
import { UserRole, UserStatus } from '../../../types/enums';
import { getOtpExpiry, isOtpExpired } from '@shared/utils/helpers/common.utils';
import { RegisterDto } from '../dtos/register.dto';
import { LoginDto } from '../dtos/login.dto';
import { HashingUtil } from '@shared/utils/hashing/hashing.utils';
import { EmailService } from '@modules/email/email.service';
import { ExpoService } from '@modules/notification/services/expo.service';
import { ResendOtpDto, ResendPhoneOtpDto } from '../dtos/verify-otp.dto';
import { CouponService } from '@modules/coupon-referral/service/cupon.service';
import { ReferralService } from '@modules/coupon-referral/service/referal.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Role } from '@modules/core/entities/role.entity';
import { DojahAdapter } from '@adapters/kyc/dojah/dojah.adapter';
import { DeleteUserDto } from '../dtos/deleteuser.dto';
import { AdminRepository } from '@adapters/repositories/admin.repository';
import { LoginAdminDto } from '@modules/admin/dtos/login.dto';
import { Admin } from '@modules/core/entities/admin.entity';
import { CreateAdminDto } from '@modules/admin/dtos/create-admin.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passengerRepository: PassengerRepository,
    private readonly driverRepository: DriverRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly randomnessUtil: RandomnessUtil,
    private readonly hashingUtil: HashingUtil,
    private readonly emailService: EmailService,
    private readonly expoService: ExpoService,
    private readonly referralService: ReferralService,
    private readonly couponService: CouponService,
    private readonly dojahAdapter: DojahAdapter,
    private readonly adminRepo: AdminRepository,
    


    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>
    
    
    
  ) {}

  async register(dto: RegisterDto, entityManager?: EntityManager): Promise<User> {
    const existingUser = await this.userRepository.findByEmail(dto.email);
    if (existingUser) throw new ConflictException('Email already in use');

    const existingPhone = await this.userRepository.findByPhone(dto.phone);
    if (existingPhone) throw new ConflictException('Phone number already in use');

      const role = await this.roleRepository.findOne({ 
      where: { name: dto.role } 
    });
    
    if (!role) {
      throw new NotFoundException(`Role '${dto.role}' not found`);
    }

    const hashedPassword = await this.hashingUtil.hash(dto.password);
    const referralCode = this.randomnessUtil.generateRandomStringWithNumbers(8);
    const otp = this.randomnessUtil.generateOtp();


    await this.emailService.sendOtp({ to: dto.email, firstName: dto.firstName, otp });
    await this.emailService.sendWelcome({ to: dto.email, firstName: dto.lastName, role: dto.role });
    const otpExpiresAt = getOtpExpiry(this.configService.get<number>('common.otp.durationMinutes'));

    const user = await this.userRepository.createUser(
      {
        ...dto,
        password: hashedPassword,
        referralCode,
        otpCode: otp,
        otpExpiresAt,
        roleId: role.id,
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

    // ── Phone verification OTP — for passengers AND drivers ──
if (user.phone && (user.role === UserRole.PASSENGER || user.role === UserRole.DRIVER)) {
  const minutes = this.configService.get<number>('common.otp.durationMinutes');
  const phoneOtp = this.randomnessUtil.generateOtp();

  await this.userRepository.updateUser(
    user.id,
    { phoneOtpCode: phoneOtp, phoneOtpExpiresAt: getOtpExpiry(minutes) },
    entityManager,
  );
  user.phoneOtpCode = phoneOtp;
  user.phoneOtpExpiresAt = getOtpExpiry(minutes);

  this.dojahAdapter
    .sendSms({
      destination: user.phone,
      message: `Your Tru Booker verification code is ${phoneOtp}. It expires in ${minutes} minutes.`,
    })
    .catch(() => {/* logged in provider */});
}

      // ── Referral: record who referred this user (if referralCode supplied) ──
  if (dto.referralCode && user.role === UserRole.PASSENGER) {
    await this.referralService.recordReferral(
      user.id,
      dto.referralCode,
      entityManager,
    );
  }

    // ── Welcome coupon: send if admin has an active welcome coupon running ──
  if (user.role === UserRole.PASSENGER) {
    // Fire-and-forget — never blocks registration
    this.couponService.dispatchWelcomeCouponIfActive(user).catch((err) => {
      // Already logged inside the service
    });
  }
  

     // SEND PUSH NOTIFICATION
  if (user.expoToken) {
    await this.expoService.sendPushNotification(
      user.expoToken,
      'Welcome',
      `Your ${user.role} account was created successfully`,
      {
        userId: user.id,
      },
    );
  }

    // TODO: Send OTP via notification service
    return user;
  }

  async login(dto: LoginDto): Promise<{ user: User; accessToken: string; refreshToken: string }> {
    const user = await this.userRepository.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const isPasswordValid = await this.hashingUtil.compare(dto.password, user.password);
    if (!isPasswordValid) throw new UnauthorizedException('Invalid credentials');

    if (!user.isEmailVerified) throw new UnauthorizedException('Please verify your email first');
    if (!user.isPhoneVerified) throw new UnauthorizedException('Please verify your phone first');

    if (user.status === UserStatus.SUSPENDED)
      throw new UnauthorizedException('Your account has been suspended');

    const tokens = this.generateTokens(user);
    return { user, ...tokens };
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
  
      const tokens = this.generateAdminTokens(user);
      return { user, ...tokens };
    }

     async createAdmin(dto: CreateAdminDto, entityManager?: EntityManager): Promise<Admin> {
        const existingUser = await this.adminRepo.findByEmail(dto.email);
    
        if (existingUser) {
          throw new Error('Email already in use');
        }
    
        const role = await this.roleRepository.findOne({ 
      where: { name: dto.role } 
    });
    
    if (!role) {
      throw new NotFoundException(`Role '${dto.role}' not found`);
    }
    
        const hashedPassword = await this.hashingUtil.hash(dto.password);
            const otp = this.randomnessUtil.generateOtp();
            await this.emailService.sendOtp({ to: dto.email, firstName: dto.firstName, otp });
                await this.emailService.sendWelcome({ to: dto.email, firstName: dto.firstName, role: dto.role });
    
           const otpExpiresAt = getOtpExpiry(this.configService.get<number>('common.otp.durationMinutes'));
            
        const user = await this.adminRepo.createAdmin(
         {
          email: dto.email,
          fullName: `${dto.firstName} ${dto.lastName}`,  // ← entity uses fullName
          phone: dto.phoneNumber,                         // ← entity uses phone
          roleId: role.id,                                // ← entity uses roleId, not roleName
          password: hashedPassword,
          role:role.name,
          otpCode: otp,
          otpExpiresAt,
          status: UserStatus.PENDING,
          metadata: dto.meta,
        },
          entityManager,
        );
    
       
    
        return user;
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
  async verifyPhoneOtp(phone: string, otp:string, entityManager?: EntityManager): Promise<User>{
     const user = await this.userRepository.findByPhone(phone);
     if (!user) throw new BadRequestException('User not found');
     if (user.phoneOtpCode !== otp) throw new BadRequestException('Invalid OTP');
     if (isOtpExpired(user.phoneOtpExpiresAt)) throw new BadRequestException('OTP has expired');

    return this.userRepository.updateUser(
      user.id,
      { isPhoneVerified: true, status: UserStatus.ACTIVE, phoneOtpCode: null, phoneOtpExpiresAt: null },
      entityManager,
    );
  
  }

    async verifyAdminOtp(email: string, otp: string, entityManager?: EntityManager): Promise<Admin> {
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


  async resendOtp({email}: ResendOtpDto, entityManager?: EntityManager): Promise<void> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) throw new BadRequestException('User not found');
    if (user.isEmailVerified) throw new BadRequestException('Email already verified');


    const otp = this.randomnessUtil.generateOtp();
    const otpExpiresAt = getOtpExpiry(this.configService.get<number>('common.otp.durationMinutes'));
    await this.emailService.sendOtp({ to: user.email, firstName: user.firstName, otp });
    await this.userRepository.updateUser(user.id, { otpCode: otp, otpExpiresAt }, entityManager);
    // TODO: send OTP via notification service
  }

  async resendPhoneOtp({phone}: ResendPhoneOtpDto, entityManager?: EntityManager): Promise<void>{
    const user = await this.userRepository.findByPhone(phone);
    if(!user) throw new BadRequestException("User not found");
    if(user.isPhoneVerified) throw new BadRequestException("user phone already verified")

    const phoneOtp = this.randomnessUtil.generateOtp();
  const minutes = this.configService.get<number>('common.otp.durationMinutes');
  const phoneExpires = user.phoneOtpExpiresAt = getOtpExpiry(minutes);

    await this.dojahAdapter.sendSms({
            destination: user.phone,
      message: `Your Tru Booker verification code is ${phoneOtp}. It expires in ${minutes} minutes.`,
    })
    await this.userRepository.updateUser(user.id, {phoneOtpCode: phoneOtp, phoneOtpExpiresAt: phoneExpires}, entityManager)
  }

  async forgotPassword(email: string, entityManager?: EntityManager): Promise<void> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) return; // Don't reveal if email exists

    const otp = this.randomnessUtil.generateOtp();
    const otpExpiresAt = getOtpExpiry(this.configService.get<number>('common.otp.durationMinutes'));
    await this.emailService.sendPasswordReset({ to: user.email, firstName: user.firstName, otp });
    await this.userRepository.updateUser(user.id, { otpCode: otp, otpExpiresAt }, entityManager);
    // TODO: send reset OTP via notification service
  }

  async resetPassword(email: string, otp: string, newPassword: string, entityManager?: EntityManager): Promise<void> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) throw new BadRequestException('User not found');
    if (user.otpCode !== otp) throw new BadRequestException('Invalid OTP');
    if (isOtpExpired(user.otpExpiresAt)) throw new BadRequestException('OTP has expired');

    const hashedPassword = await this.hashingUtil.hash(newPassword);
    await this.userRepository.updateUser(
      user.id,
      { password: hashedPassword, otpCode: null, otpExpiresAt: null },
      entityManager,
    );
  }

  async deleteAccount(userId: string, dto: DeleteUserDto, entityManager?: EntityManager){
    const del = await this.userRepository.deleteUser(userId, dto, entityManager)
    return del;
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

    generateAdminTokens(user: Admin): { accessToken: string; refreshToken: string } {
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
