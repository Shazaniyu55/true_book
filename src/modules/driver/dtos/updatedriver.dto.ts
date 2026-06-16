import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsObject, IsOptional, IsString, IsUrl, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateDriverProfileDto {
  @ApiPropertyOptional({ example: 'Emeka' })
  @IsOptional() @IsString() firstName?: string;

  @ApiPropertyOptional({ example: 'Okafor' })
  @IsOptional() @IsString() lastName?: string;

    @ApiPropertyOptional({ example: 'Okafor Emeka' })
  @IsOptional() @IsString() fullName?: string;

  @ApiPropertyOptional({ example: '+2348012345678' })
  @IsOptional() @IsString() phone?: string;

  @ApiPropertyOptional({ description: 'Profile photo URL (after Cloudinary upload)' })
  @IsOptional() @IsString() profileImage?: string;

  @ApiPropertyOptional({ example: 'Lagos' })
  @IsOptional() @IsString() state?: string;

    @ApiProperty({ example: '1999-6-05' })
    @IsOptional()
    @IsDateString()
    dob: Date;

  @ApiProperty({ example: 'Abuja' })
  @IsString()
  @IsOptional()
  city: string;

    @ApiProperty({ example: 'Abuja 4 wuse' })
  @IsString()
  @IsOptional()
  address: string;

  @ApiProperty({ example: 'male' })
  @IsString()
  @IsOptional()
  gender: string;

    @ApiProperty({ example: 'Nigeria' })
  @IsString()
  @IsOptional()
  country: string;
}