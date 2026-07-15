import { IsEmail, IsNotEmpty, IsString, MinLength, MaxLength, IsEnum, IsOptional, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ContactSupportStatus, UserRole } from 'src/types/enums';

// ─── Create a contact support request ────────────────────────────────────────
// Guest fields (firstName/lastName/email) are optional at the DTO level
// because authenticated users are resolved from the token in the service.
// The service enforces them when no user is present.

export class CreateContactSupportDto {
  @ApiProperty({
    description: 'Subject of the support request',
    example: 'Login Issues',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  subject: string;

  @ApiProperty({
    description: 'Detailed message',
    example: 'I am unable to login to my account...',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(10)
  message: string;

  @ApiPropertyOptional({
    description: 'First name — required for guest (unauthenticated) users',
    example: 'John',
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  firstName?: string;

  @ApiPropertyOptional({
    description: 'Last name — required for guest (unauthenticated) users',
    example: 'Doe',
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  lastName?: string;

  @ApiPropertyOptional({
    description: 'Email address — required for guest (unauthenticated) users',
    example: 'john@example.com',
  })
  @IsOptional()
  @IsEmail()
  email?: string;
}

// ─── Admin/user listing query ────────────────────────────────────────────────

export class ContactSupportQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Search subject, message, email or name' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: ContactSupportStatus })
  @IsOptional()
  @IsEnum(ContactSupportStatus)
  status?: ContactSupportStatus;

  @ApiPropertyOptional({ enum: UserRole })
  @IsOptional()
  @IsEnum(UserRole)
  userType?: UserRole;
}

// ─── Update status (Admin) ───────────────────────────────────────────────────

export class UpdateContactSupportStatusDto {
  @ApiProperty({ enum: ContactSupportStatus, example: ContactSupportStatus.RESOLVED })
  @IsNotEmpty()
  @IsEnum(ContactSupportStatus)
  status: ContactSupportStatus;
}

export class ContactSupportResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  subject: string;

  @ApiProperty()
  message: string;

  @ApiProperty()
  user_type: UserRole;

  @ApiProperty()
  status: ContactSupportStatus;

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  updated_at: Date;
}