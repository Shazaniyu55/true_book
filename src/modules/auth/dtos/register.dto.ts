import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, Matches, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { UserRole } from '../../../types/enums';

export class RegisterDto {
  @ApiProperty({ example: 'John' })
  @IsNotEmpty()
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsNotEmpty()
  @IsString()
  lastName: string;

  @ApiProperty({ example: 'john Doe' })
  @IsNotEmpty()
  @IsString()
  fullName: string;

  @ApiProperty({ example: '1999-6-05' })
  @IsNotEmpty()
  @IsDateString()
  dob: Date;

  @ApiProperty({ example: 'john@example.com' })
  @IsNotEmpty()
  @IsEmail()
  @Transform(({ value }) => value?.toLowerCase()?.trim())
  email: string;

  @ApiProperty({ example: '+2348012345678' })
  @IsNotEmpty()
  @IsString()
  phone: string;

  @ApiProperty({ example: 'Password123' })
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, { message: 'Password must contain uppercase, lowercase, and number' })
  password: string;

  @ApiPropertyOptional({ enum: UserRole, default: UserRole.PASSENGER })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({ example: 'ABC123' })
  @IsOptional()
  @IsString()
  referralCode?: string;

  @ApiProperty({ example: 'Abuja' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ example: 'Abuja 4 wuse' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ example: 'male' })
  @IsString()
  @IsNotEmpty()
  gender: string;

  @ApiProperty({ example: 'Nigeria' })
  @IsString()
  @IsNotEmpty()
  country: string;
}

// Preserved typo for mobile backward compat
export class RegisterPassangerDto extends RegisterDto {}
