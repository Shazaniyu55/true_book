import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class WalletTxQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional() @Type(() => Number) @IsNumber() page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional() @Type(() => Number) @IsNumber() limit?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;

  @ApiPropertyOptional({ example: '2025-01-01' })
  @IsOptional() @IsISO8601() start_date?: string;

  @ApiPropertyOptional({ example: '2025-12-31' })
  @IsOptional() @IsISO8601() end_date?: string;
}