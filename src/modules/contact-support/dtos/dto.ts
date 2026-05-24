import { IsEmail, IsNotEmpty, IsString, MinLength, MaxLength, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContactSupportStatus, UserRole } from 'src/types/enums';

export class CreateContactSupportDto {
  @ApiProperty({
    description: 'Full name of the person',
    example: 'John Doe',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name: string;

  @ApiProperty({
    description: 'Email address',
    example: 'john@example.com',
  })
  @IsNotEmpty()
  @IsEmail()
  email: string;

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
    description: 'Type of user',
    enum: UserRole,
    default: UserRole.PASSENGER,
  })
  @IsOptional()
  @IsEnum(UserRole)
  user_type?: UserRole;
}

export class UpdateContactSupportDto {
  @ApiPropertyOptional({
    description: 'Subject of the support request',
    example: 'Login Issues',
  })
  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  subject?: string;

  @ApiPropertyOptional({
    description: 'Detailed message',
    example: 'I am unable to login to my account...',
  })
  @IsOptional()
  @IsString()
  @MinLength(10)
  message?: string;

  @ApiPropertyOptional({
    description: 'Status of the support request',
    enum: ContactSupportStatus,
  })
  @IsOptional()
  @IsEnum(ContactSupportStatus)
  status?: ContactSupportStatus;
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