import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Driver } from '@modules/core/entities/driver.entity';
import { Passenger } from '@modules/core/entities/passenger.entity';
import { DocumentVerification } from '@modules/core/entities/document-verification.entity';
import { DojahAdapter } from '@adapters/kyc/dojah/dojah.adapter';

import {
  UploadDocumentDto,
  VerifyDriverBvnDto,
  VerifyDriverLicenseDto,
  VerifyDriverNinDto,
  VerifyPassengerBvnDto,
  VerifyPassengerNinDto,
  VerifyPhoneDto,
} from '../dtos/kyc.dto';
import { DocumentStatus, KycStatus } from '../../../types/enums';
import { CloudinaryService } from '@modules/cloudinary/services/cloudinary.service';
import { User } from '@modules/core/entities/user.entity';
import { getOtpExpiry } from '@shared/utils/helpers/common.utils';
import { RandomnessUtil } from '@shared/utils/encryption/randomness.util';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class KycService {
  private readonly logger = new Logger(KycService.name);

  constructor(
    @InjectRepository(Driver) private readonly driverRepo: Repository<Driver>,
    @InjectRepository(Passenger) private readonly passengerRepo: Repository<Passenger>,
    @InjectRepository(DocumentVerification) private readonly docRepo: Repository<DocumentVerification>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly dojahAdapter: DojahAdapter,
    private readonly cloudinaryService: CloudinaryService,
    private readonly randomnessUtil: RandomnessUtil,
    private readonly configService: ConfigService
    
  ) {}

  // ══════════════════════════════════════════════════════════════════════════
  // DRIVER KYC
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Returns the full KYC status for a driver, including all documents.
   */
  async getDriverKycStatus(userId: string) {
    const driver = await this.getDriverOrThrow(userId);
    const documents = await this.docRepo.find({
      where: { driverId: driver.id },
      order: { createdAt: 'DESC' },
    });

    return {
      kycStatus: driver.kycStatus,
      bvnVerified: driver.bvnVerified,
      bvnVerifiedAt: driver.bvnVerifiedAt,
      ninVerified: driver.ninVerified,
      ninVerifiedAt: driver.ninVerifiedAt,
      licenseVerified: driver.licenseVerified,
      licenseVerifiedAt: driver.licenseVerifiedAt,
      documents,
      completionPercentage: this.calculateDriverKycCompletion(driver, documents),
    };
  }

  /**
   * Verify driver BVN via Dojah.
   * Checks that the BVN matches the name on the driver's profile.
   */
  async verifyDriverBvn(userId: string, dto: VerifyDriverBvnDto) {
    const driver = await this.getDriverOrThrow(userId);

    if (driver.bvnVerified) {
      throw new ConflictException('BVN is already verified');
    }

    // Prevent re-submission of same BVN in rapid succession
    if (driver.bvn && driver.bvn === dto.bvn) {
      throw new BadRequestException('BVN verification is already pending or was previously attempted');
    }

    this.logger.log(`Verifying BVN for driver ${driver.id}`);

    let verificationResult: any;
    try {
      verificationResult = await this.dojahAdapter.verifyBvn({
        bvn: dto.bvn,
        selfie_image: dto.selfieImage,
      });
    } catch (err) {
      this.logger.error(`Dojah BVN verification failed for driver ${driver.id}`, err?.message);
      throw new BadRequestException(err?.message || 'BVN verification failed. Please check your BVN and try again.');
    }

    const entity = verificationResult.entity ?? {};

    // Cross-check name against user profile
    const nameMatchResult = this.crossCheckName(driver.user, entity);

    await this.driverRepo.update(driver.id, {
      bvn: dto.bvn,
      bvnVerified: nameMatchResult.passed,
      bvnData: {
        ...entity,
        nameMatch: nameMatchResult,
        verifiedAt: new Date().toISOString(),
      },
      bvnVerifiedAt: nameMatchResult.passed ? new Date() : null,
    });

    if (!nameMatchResult.passed) {
      throw new BadRequestException(
        `BVN name mismatch. Expected name similar to "${nameMatchResult.expectedName}" but got "${nameMatchResult.returnedName}". Please contact support if this is incorrect.`,
      );
    }

    await this.recalculateDriverKycStatus(driver.id);

    return {
      success: true,
      message: 'BVN verified successfully',
      data: {
        bvnVerified: true,
        firstName: entity.first_name,
        lastName: entity.last_name,
        phone: this.maskPhone(entity.phone_number1 || entity.phone),
        dateOfBirth: entity.date_of_birth,
      },
    };
  }

    /**
   * Verify driver PhoneNumber via Dojah.
   * Checks that the PhoneNumber matches the name on the driver's profile.
   */

async sendPhoneOtp(userId: string) {
  const user = await this.getUserOrThrow(userId);

  if (!user.phone) throw new BadRequestException('No phone number on file');
  if (user.isPhoneVerified) throw new ConflictException('Phone number is already verified');

  const minutes = this.configService.get<number>('common.otp.durationMinutes') ?? 10;
  const otp = this.randomnessUtil.generateOtp();

  await this.userRepo.update(user.id, {
    phoneOtpCode: otp,
    phoneOtpExpiresAt: getOtpExpiry(minutes),
  });

  const sent = await this.dojahAdapter.sendSms({
    destination: user.phone,
    message: `Your Tru Booker verification code is ${otp}. It expires in ${minutes} minutes.`,
  });
  if (!sent) throw new BadRequestException('Could not send SMS. Please try again.');

  return { success: true, message: 'Verification code sent to your phone' };
}

  /**
   * Verify driver NIN via Dojah.
   */
  async verifyDriverNin(userId: string, dto: VerifyDriverNinDto) {
    const driver = await this.getDriverOrThrow(userId);

    if (driver.ninVerified) {
      throw new ConflictException('NIN is already verified');
    }

    this.logger.log(`Verifying NIN for driver ${driver.id}`);

    let verificationResult: any;
    try {
      verificationResult = await this.dojahAdapter.verifyNin({ nin: dto.nin });
    } catch (err) {
      this.logger.error(`Dojah NIN verification failed for driver ${driver.id}`, err?.message);
      throw new BadRequestException(err?.message || 'NIN verification failed. Please check your NIN and try again.');
    }

    const entity = verificationResult.entity ?? {};
    const nameMatchResult = this.crossCheckName(driver.user, entity);

    await this.driverRepo.update(driver.id, {
      nin: dto.nin,
      ninVerified: nameMatchResult.passed,
      ninData: {
        ...entity,
        nameMatch: nameMatchResult,
        verifiedAt: new Date().toISOString(),
      },
      ninVerifiedAt: nameMatchResult.passed ? new Date() : null,
    });

    if (!nameMatchResult.passed) {
      throw new BadRequestException(
        `NIN name mismatch. Expected "${nameMatchResult.expectedName}" but got "${nameMatchResult.returnedName}".`,
      );
    }

    await this.recalculateDriverKycStatus(driver.id);

    return {
      success: true,
      message: 'NIN verified successfully',
      data: {
        ninVerified: true,
        firstName: entity.firstname,
        lastName: entity.surname,
        dateOfBirth: entity.birthdate,
      },
    };
  }

  /**
   * Verify driver's license via Dojah.
   */
  async verifyDriverLicense(userId: string, dto: VerifyDriverLicenseDto) {
    const driver = await this.getDriverOrThrow(userId);

    if (driver.licenseVerified) {
      throw new ConflictException("Driver's license is already verified");
    }

    // Must have BVN or NIN verified first
    if (!driver.bvnVerified && !driver.ninVerified) {
      throw new BadRequestException(
        'Please verify your BVN or NIN before verifying your driving license',
      );
    }

    this.logger.log(`Verifying driver's license for driver ${driver.id}`);

    let verificationResult: any;
    try {
      verificationResult = await this.dojahAdapter.verifyDriversLicense({
        license_number: dto.licenseNumber,
        date_of_birth: dto.dateOfBirth,
        first_name: dto.firstName,
        last_name: dto.lastName,
      });
    } catch (err) {
      this.logger.error(`Dojah license verification failed for driver ${driver.id}`, err?.message);
      throw new BadRequestException(
        err?.message || "Driver's license verification failed. Please check your details and try again.",
      );
    }

    const entity = verificationResult.entity ?? {};

    await this.driverRepo.update(driver.id, {
      licenseNumber: dto.licenseNumber,
      licenseVerified: true,
      licenseData: {
        ...entity,
        verifiedAt: new Date().toISOString(),
      },
      licenseVerifiedAt: new Date(),
      licenseExpiry: entity.expiry_date ? new Date(entity.expiry_date) : null,
    });

    await this.recalculateDriverKycStatus(driver.id);

    return {
      success: true,
      message: "Driver's license verified successfully",
      data: {
        licenseVerified: true,
        licenseNumber: dto.licenseNumber,
        firstName: entity.first_name,
        lastName: entity.last_name,
        expiryDate: entity.expiry_date,
      },
    };
  }

  /**
   * Upload a KYC document (stored as Cloudinary URL, pending admin review).
   */
async uploadDriverDocument(
    userId: string,
    dto: UploadDocumentDto,
    file: Express.Multer.File,
  ) {
    const driver = await this.getDriverOrThrow(userId);

    const existing = await this.docRepo.findOne({
      where: {
        driverId: driver.id,
        documentType: dto.documentType,
        status: DocumentStatus.PENDING,
      },
    });
    if (existing) {
      throw new ConflictException(`A ${dto.documentType} document is already pending review`);
    }

    // Upload under an authenticated request — validation happens inside the service
    const uploaded = await this.cloudinaryService.upload(file, {
      folder: `kyc/drivers/${driver.id}`,
    });

    const doc = this.docRepo.create({
      driverId: driver.id,
      documentType: dto.documentType,
      documentUrl: uploaded.secure_url, // server-produced, not client-supplied
      status: DocumentStatus.PENDING,
    });

    const saved = await this.docRepo.save(doc);
    this.logger.log(`Document ${dto.documentType} uploaded for driver ${driver.id}`);

    return { success: true, message: 'Document uploaded and queued for review', data: saved };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PASSENGER KYC
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Returns the KYC status for a passenger.
   */
  async getPassengerKycStatus(userId: string) {
    const passenger = await this.getPassengerOrThrow(userId);

    return {
      kycStatus: passenger.kycStatus,
      bvnVerified: passenger.bvnVerified,
      bvnVerifiedAt: passenger.bvnVerifiedAt,
      ninVerified: passenger.ninVerified,
      ninVerifiedAt: passenger.ninVerifiedAt,
      completionPercentage: this.calculatePassengerKycCompletion(passenger),
    };
  }

  /**
   * Verify passenger BVN via Dojah.
   */
  async verifyPassengerBvn(userId: string, dto: VerifyPassengerBvnDto) {
    const passenger = await this.getPassengerOrThrow(userId);

    if (passenger.bvnVerified) {
      throw new ConflictException('BVN is already verified');
    }

    this.logger.log(`Verifying BVN for passenger ${passenger.id}`);

    let verificationResult: any;
    try {
      verificationResult = await this.dojahAdapter.verifyBvn({ bvn: dto.bvn });
    } catch (err) {
      this.logger.error(`Dojah BVN verification failed for passenger ${passenger.id}`, err?.message);
      throw new BadRequestException(err?.message || 'BVN verification failed. Please check your BVN and try again.');
    }

    const entity = verificationResult.entity ?? {};
    const nameMatchResult = this.crossCheckName(passenger.user, entity);

    await this.passengerRepo.update(passenger.id, {
      bvn: dto.bvn,
      bvnVerified: nameMatchResult.passed,
      bvnData: {
        ...entity,
        nameMatch: nameMatchResult,
        verifiedAt: new Date().toISOString(),
      },
      bvnVerifiedAt: nameMatchResult.passed ? new Date() : null,
    });

    if (!nameMatchResult.passed) {
      throw new BadRequestException(
        `BVN name mismatch. Expected "${nameMatchResult.expectedName}" but got "${nameMatchResult.returnedName}".`,
      );
    }

    await this.recalculatePassengerKycStatus(passenger.id);

    return {
      success: true,
      message: 'BVN verified successfully',
      data: {
        bvnVerified: true,
        firstName: entity.first_name,
        lastName: entity.last_name,
        phone: this.maskPhone(entity.phone_number1 || entity.phone),
      },
    };
  }

  /**
   * Verify passenger NIN via Dojah.
   */
  async verifyPassengerNin(userId: string, dto: VerifyPassengerNinDto) {
    const passenger = await this.getPassengerOrThrow(userId);

    if (passenger.ninVerified) {
      throw new ConflictException('NIN is already verified');
    }

    this.logger.log(`Verifying NIN for passenger ${passenger.id}`);

    let verificationResult: any;
    try {
      verificationResult = await this.dojahAdapter.verifyNin({ nin: dto.nin });
    } catch (err) {
      this.logger.error(`Dojah NIN verification failed for passenger ${passenger.id}`, err?.message);
      throw new BadRequestException(err?.message || 'NIN verification failed. Please check your NIN and try again.');
    }

    const entity = verificationResult.entity ?? {};
    const nameMatchResult = this.crossCheckName(passenger.user, entity);

    await this.passengerRepo.update(passenger.id, {
      nin: dto.nin,
      ninVerified: nameMatchResult.passed,
      ninData: {
        ...entity,
        nameMatch: nameMatchResult,
        verifiedAt: new Date().toISOString(),
      },
      ninVerifiedAt: nameMatchResult.passed ? new Date() : null,
    });

    if (!nameMatchResult.passed) {
      throw new BadRequestException(
        `NIN name mismatch. Expected "${nameMatchResult.expectedName}" but got "${nameMatchResult.returnedName}".`,
      );
    }

    await this.recalculatePassengerKycStatus(passenger.id);

    return {
      success: true,
      message: 'NIN verified successfully',
      data: {
        ninVerified: true,
        firstName: entity.firstname,
        lastName: entity.surname,
      },
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Recalculate and persist driver KYC status after any verification step.
   * COMPLETED = BVN (or NIN) verified + License verified + at least one doc approved.
   */
  private async recalculateDriverKycStatus(driverId: string): Promise<void> {
    const driver = await this.driverRepo.findOne({ where: { id: driverId } });
    if (!driver) return;

    const docs = await this.docRepo.find({ where: { driverId } });
    const hasApprovedDoc = docs.some((d) => d.status === DocumentStatus.APPROVED);
    const identityVerified = driver.bvnVerified || driver.ninVerified;

    let newStatus = KycStatus.NOT_STARTED;

    if (identityVerified || driver.licenseVerified || docs.length > 0) {
      newStatus = KycStatus.IN_PROGRESS;
    }

    if (identityVerified && driver.licenseVerified && hasApprovedDoc) {
      newStatus = KycStatus.COMPLETED;
    }

    await this.driverRepo.update(driverId, { kycStatus: newStatus });
  }

  /**
   * Recalculate passenger KYC — COMPLETED once BVN or NIN is verified.
   */
  private async recalculatePassengerKycStatus(passengerId: string): Promise<void> {
    const passenger = await this.passengerRepo.findOne({ where: { id: passengerId } });
    if (!passenger) return;

    let newStatus = KycStatus.NOT_STARTED;

    if (passenger.bvnVerified || passenger.ninVerified) {
      newStatus = KycStatus.IN_PROGRESS;
    }

    if (passenger.bvnVerified && passenger.ninVerified) {
      newStatus = KycStatus.COMPLETED;
    } else if (passenger.bvnVerified || passenger.ninVerified) {
      // At least one identity check passed — mark completed for passengers
      newStatus = KycStatus.COMPLETED;
    }

    await this.passengerRepo.update(passengerId, { kycStatus: newStatus });
  }

  /**
   * Cross-checks the name returned by Dojah against the user's profile.
   * Uses a fuzzy match (Jaro-Winkler-like via normalized comparison).
   */
  private crossCheckName(
    user: any,
    entity: any,
  ): { passed: boolean; expectedName: string; returnedName: string; score: number } {
    const threshold = parseFloat(process.env.BVN_MATCH ?? '0.7');

    const expectedFirst = (user?.firstName ?? '').toLowerCase().trim();
    const expectedLast = (user?.lastName ?? '').toLowerCase().trim();

    // Dojah returns different field names for BVN vs NIN
    const returnedFirst = (
      entity?.first_name ?? entity?.firstname ?? ''
    ).toLowerCase().trim();
    const returnedLast = (
      entity?.last_name ?? entity?.surname ?? ''
    ).toLowerCase().trim();

    const firstScore = this.stringSimilarity(expectedFirst, returnedFirst);
    const lastScore = this.stringSimilarity(expectedLast, returnedLast);
    const avgScore = (firstScore + lastScore) / 2;

    return {
      passed: avgScore >= threshold,
      expectedName: `${expectedFirst} ${expectedLast}`,
      returnedName: `${returnedFirst} ${returnedLast}`,
      score: avgScore,
    };
  }

  /**
   * Simple character-overlap similarity (0–1).
   * Good enough for name matching in Nigerian contexts.
   */
  private stringSimilarity(a: string, b: string): number {
    if (!a || !b) return 0;
    if (a === b) return 1;
    const longer = a.length > b.length ? a : b;
    const shorter = a.length > b.length ? b : a;
    let matches = 0;
    for (let i = 0; i < shorter.length; i++) {
      if (longer.includes(shorter[i])) matches++;
    }
    return matches / longer.length;
  }

  private calculateDriverKycCompletion(driver: Driver, docs: DocumentVerification[]): number {
    let score = 0;
    if (driver.bvnVerified) score += 30;
    if (driver.ninVerified) score += 20;
    if (driver.licenseVerified) score += 30;
    if (docs.some((d) => d.documentType === 'profile_photo' && d.status === DocumentStatus.APPROVED)) score += 10;
    if (docs.some((d) => d.documentType === 'vehicle_paper' && d.status === DocumentStatus.APPROVED)) score += 10;
    return Math.min(score, 100);
  }

  private calculatePassengerKycCompletion(passenger: Passenger): number {
    let score = 0;
    if (passenger.bvnVerified) score += 50;
    if (passenger.ninVerified) score += 50;
    return score;
  }

  private maskPhone(phone: string): string {
    if (!phone || phone.length < 7) return '***';
    return phone.slice(0, 4) + '****' + phone.slice(-3);
  }

  private async getDriverOrThrow(userId: string): Promise<Driver> {
    const driver = await this.driverRepo.findOne({
      where: { userId: userId },
      relations: ['user'],
    });
    if (!driver) throw new NotFoundException('Driver profile not found');
    return driver;
  }

  private async getPassengerOrThrow(userId: string): Promise<Passenger> {
    const passenger = await this.passengerRepo.findOne({
      where: { userId },
      relations: ['user'],
    });
    if (!passenger) throw new NotFoundException('Passenger profile not found');
    return passenger;
  }

 private async getUserOrThrow(userId: string): Promise<User> {
  const user = await this.userRepo.findOne({ where: { id: userId } });
  if (!user) throw new NotFoundException('User not found');
  return user;
}
}