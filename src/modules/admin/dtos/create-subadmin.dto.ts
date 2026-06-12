import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
} from 'class-validator';

export class CreateSubAdminDto {
  @ApiProperty({ example: 'John' })
  @IsString() @IsNotEmpty() firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString() @IsNotEmpty() lastName: string;

  @ApiProperty({ example: 'john.doe@example.com' })
  @IsEmail() email: string;

  @ApiProperty({ example: '+2348012345678' })
  @IsPhoneNumber() phoneNumber: string;

  @ApiProperty({ example: 'Support', description: 'Role name to assign (must exist in roles table)' })
  @IsString() @IsNotEmpty() role: string;

  @ApiPropertyOptional({ example: 'Lagos' })
  @IsOptional() @IsString() city?: string;

  @ApiPropertyOptional({ example: 'Nigeria' })
  @IsOptional() @IsString() country?: string;

  @ApiPropertyOptional({ example: '4 Wuse, Abuja' })
  @IsOptional() @IsString() address?: string;

  @ApiPropertyOptional({ example: 'male' })
  @IsOptional() @IsString() gender?: string;
}