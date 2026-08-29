import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

// ─── Driver: list the request board ────────────────────────────────────────

export class BoardQueryDto {
  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;

  @ApiPropertyOptional({ example: 20, default: 20 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number = 20;

  @ApiPropertyOptional({
    example: 'Lagos',
    description: 'Only show pools whose origin or destination is in this state.',
  })
  @IsOptional() @IsString() state?: string;

  @ApiPropertyOptional({
    enum: ['intra', 'inter'],
    description: 'Filter by intra-state (within a state) or inter-state (across states) trips.',
  })
  @IsOptional() @IsString() scope?: 'intra' | 'inter';
}

// ─── Driver: claim a pooled request ────────────────────────────────────────

export class ClaimPoolDto {
  @ApiPropertyOptional({
    description:
      'Optionally attach a trip you have already created that will serve this pool. ' +
      'Must be a trip you own.',
  })
  @IsOptional() @IsUUID() tripId?: string;

  @ApiPropertyOptional({ example: 'Leaving from Jibowu park at 7am sharp.' })
  @IsOptional() @IsString() note?: string;
}
