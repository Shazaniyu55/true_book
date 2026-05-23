import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsPhoneNumber,
  IsString,
  MinLength,
} from 'class-validator';
import {  PermissionLevel, UserRole } from '../../../types/enums';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAdminDto {
  @ApiProperty({ example: 'John' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ example: 'john.doe@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @MinLength(8)
  password: string;

  // @IsUUID()
  // roleId: string;

  @ApiProperty({ example: UserRole.ADMIN })
  @IsEnum(UserRole)
  @IsOptional()
  roleName?: UserRole = UserRole.ADMIN;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  emailNotification?: boolean;

  @ApiProperty({ example: '+1234567890' })
  @IsPhoneNumber()
  phoneNumber: string;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  meta?: Record<string, any>;



  @ApiPropertyOptional({ example: PermissionLevel.FULL })
  @IsEnum(PermissionLevel)
  @IsOptional()
  permissionLevel?: PermissionLevel = PermissionLevel.FULL;
}
