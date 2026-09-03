import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

/**
 * Normalise a state filter value: trim, collapse inner whitespace, and drop a
 * trailing "state" word so "Delta", "delta", "Delta State" and " delta state "
 * all resolve to the same token the pool stores ("Delta"). Returns undefined
 * for empty/non-string input so the filter is simply skipped.
 */
const normalizeState = ({ value }: { value: unknown }): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const cleaned = value
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\s+state$/i, '')
    .trim();
  return cleaned.length ? cleaned : undefined;
};

// ─── Driver: list the request board ────────────────────────────────────────

export class BoardQueryDto {
  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;

  @ApiPropertyOptional({ example: 20, default: 20 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number = 20;

  @ApiPropertyOptional({
    example: 'Delta',
    description:
      'Match pools whose origin OR destination is in this state. ' +
      'Case-insensitive; a trailing "state" is ignored (e.g. "Delta State" → "Delta").',
  })
  @IsOptional() @Transform(normalizeState) @IsString() state?: string;

  @ApiPropertyOptional({
    example: 'Delta',
    description: 'Match only pools LEAVING this state (origin). Same normalisation as `state`.',
  })
  @IsOptional() @Transform(normalizeState) @IsString() originState?: string;

  @ApiPropertyOptional({
    example: 'Lagos',
    description: 'Match only pools GOING TO this state (destination). Same normalisation as `state`.',
  })
  @IsOptional() @Transform(normalizeState) @IsString() destinationState?: string;

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

// import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
// import {
//   IsInt,
//   IsOptional,
//   IsString,
//   IsUUID,
//   Min,
// } from 'class-validator';
// import { Type } from 'class-transformer';

// // ─── Driver: list the request board ────────────────────────────────────────

// export class BoardQueryDto {
//   @ApiPropertyOptional({ example: 1, default: 1 })
//   @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;

//   @ApiPropertyOptional({ example: 20, default: 20 })
//   @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number = 20;

//   @ApiPropertyOptional({
//     example: 'Lagos',
//     description: 'Only show pools whose origin or destination is in this state.',
//   })
//   @IsOptional() @IsString() state?: string;

//   @ApiPropertyOptional({
//     enum: ['intra', 'inter'],
//     description: 'Filter by intra-state (within a state) or inter-state (across states) trips.',
//   })
//   @IsOptional() @IsString() scope?: 'intra' | 'inter';
// }

// // ─── Driver: claim a pooled request ────────────────────────────────────────

// export class ClaimPoolDto {
//   @ApiPropertyOptional({
//     description:
//       'Optionally attach a trip you have already created that will serve this pool. ' +
//       'Must be a trip you own.',
//   })
//   @IsOptional() @IsUUID() tripId?: string;

//   @ApiPropertyOptional({ example: 'Leaving from Jibowu park at 7am sharp.' })
//   @IsOptional() @IsString() note?: string;
// }
