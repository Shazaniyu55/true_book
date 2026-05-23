import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ToggleKillSwitchDto {
  @ApiProperty({ description: 'Admin email performing the action' })
  @IsNotEmpty()
  @IsString()
  adminEmail: string;

  @ApiProperty({ description: 'Secret deactivation code from Vault/env' })
  @IsNotEmpty()
  @IsString()
  deactivationCode: string;

  @ApiPropertyOptional({ description: 'Required when deactivating — 2FA approval code' })
  @IsOptional()
  @IsString()
  twoFaCode?: string;

  @ApiPropertyOptional({ description: 'Reason for activating the kill switch' })
  @IsOptional()
  @IsString()
  reason?: string;
}
