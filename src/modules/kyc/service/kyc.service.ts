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
  

} from '../dtos/kyc.dto';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { LICENSE_QUEUE, LicenseJobData } from '../dtos/kyc.queue';
import { NotificationService } from '@modules/notification/services/notification.service';
import { NotificationType } from 'src/types/enums';
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
    private readonly configService: ConfigService,
    @InjectQueue(LICENSE_QUEUE) private readonly licenseQueue: Queue<LicenseJobData>,
    private readonly notificationService: NotificationService,
    
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
      kycStatus: driver.kycComplete,
      licenseVerified: driver.licenseVerified,
      licenseVerifiedAt: driver.licenseVerifiedAt,
      documents,
      completionPercentage: this.calculateDriverKycCompletion(driver, documents),
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
   * Verify driver's license via Dojah.
   */


//  async verifyDriverLicense(
//   userId: string,
//   files: {
//     drivers_license?: Express.Multer.File[];
//     vehicle_insurance?: Express.Multer.File[];
//     reg_docs?: Express.Multer.File[];
//   },
// ) {
//   const driver = await this.getDriverOrThrow(userId);
//   if (driver.licenseVerified) {
//     throw new ConflictException("Driver's license is already verified");
//   }

//   const front = files?.drivers_license?.[0];
//   if (!front) throw new BadRequestException('Drivers license image is required');

//   const regDocs = files?.reg_docs?.[0];
//   if (!regDocs) throw new BadRequestException('Registration documents are required');

//   const insurance = files?.vehicle_insurance?.[0];

//   // 1. Upload images to Cloudinary
//   const frontUpload = await this.cloudinaryService.upload(front, {
//     folder: `kyc/drivers/${driver.id}/license`,
//   });
//   const regDocsUpload = await this.cloudinaryService.upload(regDocs, {
//     folder: `kyc/drivers/${driver.id}/license`,
//   });
//   const insuranceUpload = insurance
//     ? await this.cloudinaryService.upload(insurance, {
//         folder: `kyc/drivers/${driver.id}/insurance`,
//       })
//     : null;

//   // 2. Send the Cloudinary URLs to Dojah document analysis
//   let result: any;
//   try {
//     result = await this.dojahAdapter.verifyDriversLicenseViaImage({
//       driversLicense: frontUpload.secure_url,
//       regDocs: regDocsUpload.secure_url,
//     });
//   } catch (err) {
//     this.logger.error(`Dojah analysis failed for driver ${driver.id}`, err?.message);
//     throw new BadRequestException(err?.message || "Driver's license verification failed.");
//   }

//   const entity = result.entity ?? {};
//   if (!result.valid) {
//     throw new BadRequestException(
//       `Licence could not be validated (${entity?.status?.reason ?? 'NOT_VALID'})`,
//     );
//   }

  // await this.driverRepo.update(driver.id, {
  //   //license: dto.licenseNumber ?? null,
  //   licenseVerified: true,
  //   licenseData: {
  //     ...entity,
  //     driverLicense: frontUpload.secure_url,
  //     regDocs: regDocsUpload.secure_url,
  //     vehicleInsurance: insuranceUpload?.secure_url ?? null,
  //     verifiedAt: new Date().toISOString(),
  //   },
  //   licenseVerifiedAt: new Date(),
  // });

//   await this.recalculateDriverKycStatus(driver.id);

//   return {
//     success: true,
//     message: "Driver's license verified successfully",
//     data: {
//       licenseVerified: true,
//       documentName: entity?.document_type?.document_name,
//       country: entity?.document_type?.document_country_name,
//     },
//   };
// }

// REPLACE the whole verifyDriverLicense method with this submit-and-return version
async verifyDriverLicense(
  userId: string,
  files: {
    drivers_license?: Express.Multer.File[];
    vehicle_insurance?: Express.Multer.File[];
    reg_docs?: Express.Multer.File[];
  },
) {
  const driver = await this.getDriverOrThrow(userId);
  if (driver.licenseVerified) {
    throw new ConflictException("Driver's license is already verified");
  }

  const front = files?.drivers_license?.[0];
  if (!front) throw new BadRequestException('Drivers license image is required');

  const regDocs = files?.reg_docs?.[0];
  if (!regDocs) throw new BadRequestException('Registration documents are required');

  const insurance = files?.vehicle_insurance?.[0];

  // Uploads stay inline — fast, reliable, and we need the URLs for the job.
  const [frontUpload, regDocsUpload, insuranceUpload] = await Promise.all([
    this.cloudinaryService.upload(front, { folder: `kyc/drivers/${driver.id}/license` }),
    this.cloudinaryService.upload(regDocs, { folder: `kyc/drivers/${driver.id}/license` }),
    insurance
      ? this.cloudinaryService.upload(insurance, { folder: `kyc/drivers/${driver.id}/insurance` })
      : Promise.resolve(null),
  ]);

  // Mark processing so GET /kyc/status reflects it immediately.
await this.driverRepo.update(driver.id, {
    licenseData: {
      ...(driver.licenseData ?? {}),
      driverLicense: frontUpload.secure_url,
      regDocs: regDocsUpload.secure_url,
      vehicleInsurance: insuranceUpload?.secure_url ?? null,
      verificationState: 'processing',
      submittedAt: new Date().toISOString(),
    } as Record<string, any>,
  });
  await this.recalculateDriverKycStatus(driver.id); // → IN_PROGRESS

  await this.licenseQueue.add(
    'verify',
    {
      driverId: driver.id,
      driversLicense: frontUpload.secure_url,
      regDocs: regDocsUpload.secure_url,
    },
    {
      attempts: 5,
      backoff: { type: 'exponential', delay: 60_000 }, // 1m, 2m, 4m, ...
      removeOnComplete: true,
      removeOnFail: 100,
    },
  );

  return {
    success: true,
    status: 'processing',
    message: "Your licence is being verified. We'll notify you shortly.",
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
  // PRIVATE HELPERS
  // ══════════════════════════════════════════════════════════════════════════
async finalizeLicenseVerified(driverId: string, entity: Record<string, any>): Promise<void> {
  const driver = await this.driverRepo.findOne({ where: { id: driverId } });
  if (!driver) return;

 await this.driverRepo.update(driverId, {
    licenseVerified: true,
    licenseVerifiedAt: new Date(),
    licenseData: {
      ...(driver.licenseData ?? {}),
      ...entity,
      verificationState: 'verified',
      verifiedAt: new Date().toISOString(),
    } as Record<string, any>,
  });
  await this.recalculateDriverKycStatus(driverId);

  await this.notificationService.notify({
    userId: driver.userId,
    title: 'Licence Verified',
    body: "Your driver's licence has been verified successfully.",
    type: NotificationType.DOCUMENT_APPROVED,
    data: { driverId },
  });
}

async finalizeLicenseRejected(driverId: string, reason: string): Promise<void> {
  const driver = await this.driverRepo.findOne({ where: { id: driverId } });
  if (!driver) return;

 await this.driverRepo.update(driverId, {
    licenseVerified: false,
    reason,
    licenseData: {
      ...(driver.licenseData ?? {}),
      verificationState: 'rejected',
      rejectionReason: reason,
      rejectedAt: new Date().toISOString(),
    } as Record<string, any>,
  });
  await this.recalculateDriverKycStatus(driverId);

  await this.notificationService.notify({
    userId: driver.userId,
    title: 'Licence Verification Failed',
    body: `We couldn't verify your licence: ${reason}. Please re-upload clear documents.`,
    type: NotificationType.DOCUMENT_REJECTED,
    data: { driverId, reason },
  });
}
  /**
   * Recalculate and persist driver KYC status after any verification step.
   * COMPLETED = BVN (or NIN) verified + License verified + at least one doc approved.
   */
  private async recalculateDriverKycStatus(driverId: string): Promise<void> {
    const driver = await this.driverRepo.findOne({ where: { id: driverId } });
    if (!driver) return;

    const docs = await this.docRepo.find({ where: { driverId } });
    const hasApprovedDoc = docs.some((d) => d.status === DocumentStatus.APPROVED);
    const identityVerified = driver.licenseVerified;

    let newStatus = KycStatus.NOT_STARTED;

    if (identityVerified || driver.licenseVerified || docs.length > 0) {
      newStatus = KycStatus.IN_PROGRESS;
    }

    if (identityVerified && driver.licenseVerified && hasApprovedDoc) {
      newStatus = KycStatus.COMPLETED;
    }

    await this.driverRepo.update(driverId, { kycComplete: newStatus });
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
    if (driver.licenseVerified) score += 30;
    if (driver.licenseVerified) score += 30;
    if (docs.some((d) => d.documentType === 'profile_photo' && d.status === DocumentStatus.APPROVED)) score += 10;
    if (docs.some((d) => d.documentType === 'vehicle_paper' && d.status === DocumentStatus.APPROVED)) score += 10;
    return Math.min(score, 100);
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