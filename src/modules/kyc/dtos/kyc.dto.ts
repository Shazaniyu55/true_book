import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Matches,
} from 'class-validator';

export class VerifyPhoneDto {
  @ApiProperty({ example: '123456', description: '6-digit OTP sent via SMS' })
  @IsNotEmpty()
  @IsString()
  @Length(6, 6, { message: 'OTP must be exactly 6 digits' })
  @Matches(/^\d+$/, { message: 'OTP must contain digits only' })
  otp: string;

  @ApiPropertyOptional({ example: '+2348012345678' })
  @IsOptional()
  @IsString()
  phone?: string;
}

// ─── Driver KYC DTOs ─────────────────────────────────────────────────────────

export class VerifyDriverBvnDto {
  @ApiProperty({ example: '22222222222', description: '11-digit BVN' })
  @IsNotEmpty()
  @IsString()
  @Length(11, 11, { message: 'BVN must be exactly 11 digits' })
  @Matches(/^\d+$/, { message: 'BVN must contain digits only' })
  bvn: string;

  @ApiPropertyOptional({
    description: 'Base64 selfie image for liveness check (optional)',
    example: 'data:image/jpeg;base64,...',
  })
  @IsOptional()
  @IsString()
  selfieImage?: string;
}

export class VerifyDriverNinDto {
  @ApiProperty({ example: '12345678901', description: '11-digit NIN' })
  @IsNotEmpty()
  @IsString()
  @Length(11, 11, { message: 'NIN must be exactly 11 digits' })
  @Matches(/^\d+$/, { message: 'NIN must contain digits only' })
  nin: string;
}

export class VerifyDriverLicenseDto {
  @ApiProperty({ example: 'ABC123456789', description: "Driver's license number" })
  @IsOptional()
  @IsString()
  licenseNumber: string;

  @ApiProperty({ description: 'URL of the driver license front image' })
  @IsOptional() @IsUrl() driversLicense: string;
}

// export class VerifyDriverLicenseDto {
//   @ApiProperty({ example: 'ABC123456789', description: "Driver's license number" })
//   @IsOptional()
//   @IsString()
//   licenseNumber: string;

//   @ApiProperty({ description: 'URL of the driver license front image' })
//   @IsOptional() @IsUrl() driversLicense: string;

//   @ApiProperty({ description: 'URL of the registration documents' })
//   @IsOptional() @IsUrl() regDocs: string;

//   @ApiPropertyOptional({ description: 'URL of the vehicle insurance' })
//   @IsOptional() @IsUrl() vehicleInsurance?: string;
// }

// ─── Passenger KYC DTOs ───────────────────────────────────────────────────────

export class VerifyPassengerBvnDto {
  @ApiProperty({ example: '22222222222', description: '11-digit BVN' })
  @IsNotEmpty()
  @IsString()
  @Length(11, 11, { message: 'BVN must be exactly 11 digits' })
  @Matches(/^\d+$/, { message: 'BVN must contain digits only' })
  bvn: string;
}

export class VerifyPassengerNinDto {
  @ApiProperty({ example: '12345678901', description: '11-digit NIN' })
  @IsNotEmpty()
  @IsString()
  @Length(11, 11, { message: 'NIN must be exactly 11 digits' })
  @Matches(/^\d+$/, { message: 'NIN must contain digits only' })
  nin: string;
}

// ─── Document Upload DTOs ─────────────────────────────────────────────────────

export enum DocumentType {
  PROFILE_PHOTO = 'profile_photo',
  DRIVERS_LICENSE_FRONT = 'drivers_license_front',
  DRIVERS_LICENSE_BACK = 'drivers_license_back',
  VEHICLE_PAPER = 'vehicle_paper',
  ROAD_WORTHINESS = 'road_worthiness',
  INSURANCE = 'insurance',
  NIN_SLIP = 'nin_slip',
  UTILITY_BILL = 'utility_bill',
}

export class UploadDocumentDto {
  @ApiProperty({
    enum: DocumentType,
    description: 'Type of document being uploaded',
    example: DocumentType.DRIVERS_LICENSE_FRONT,
  })
  @IsNotEmpty()
  @IsEnum(DocumentType)
  documentType: DocumentType;

  @ApiProperty({ description: 'Document URL (already uploaded by the app)' })
  @IsNotEmpty()
  @IsUrl()
  documentUrl: string;
}

// ─── Response shapes ──────────────────────────────────────────────────────────

export class KycStatusResponseDto {
  driverKyc: {
    bvnVerified: boolean;
    ninVerified: boolean;
    licenseVerified: boolean;
    kycStatus: string;
    documents: any[];
  };
}