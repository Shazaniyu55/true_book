import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { AppPlatform } from 'src/types/enums';

export class UpdateAppVersionDto {
  @ApiProperty({ example: 'driver', description: "'driver' | 'passenger'" })
  @IsNotEmpty() @IsString() appType: string;

  @ApiProperty({ enum: AppPlatform, example: AppPlatform.ANDROID })
  @IsEnum(AppPlatform) platform: AppPlatform;

  @ApiProperty({ example: '1.3.4' })
  @IsNotEmpty() @IsString() minVersion: string;

  @ApiProperty({ example: '1.4.0' })
  @IsNotEmpty() @IsString() latestVersion: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional() @IsBoolean() isForceUpdate?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional() @IsBoolean() isEnabled?: boolean;

  @ApiPropertyOptional({ example: 'A new version is available.' })
  @IsOptional() @IsString() updateMessage?: string;
}

export class VersionHistoryQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional() @Type(() => Number) page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional() @Type(() => Number) limit?: number = 20;

  @ApiPropertyOptional({ example: 'driver' })
  @IsOptional() @IsString() appType?: string;

  @ApiPropertyOptional({ enum: AppPlatform })
  @IsOptional() @IsEnum(AppPlatform) platform?: AppPlatform;
}