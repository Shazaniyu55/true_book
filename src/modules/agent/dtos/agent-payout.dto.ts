import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Min,
} from 'class-validator';

/**
 * Mirrors the frontend RTK-Query `withdrawFunds` contract (snake_case).
 * The client sends these exact fields to POST /agent/payout/initiate.
 */
export class AgentInitiatePayoutDto {
  @ApiPropertyOptional({
    example: null,
    description: 'Existing saved beneficiary id (optional)',
  })
  @IsOptional()
  @IsUUID()
  beneficiary_id?: string | null;

  @ApiProperty({ example: '0123456789' })
  @IsNotEmpty()
  @IsString()
  @Length(10, 10, { message: 'Account number must be 10 digits' })
  account_number: string;

  @ApiProperty({ example: '058', description: 'Bank code from the bank list' })
  @IsNotEmpty()
  @IsString()
  bank_code: string;

  @ApiProperty({ example: 'GTBank' })
  @IsNotEmpty()
  @IsString()
  bank_name: string;

  @ApiProperty({ example: 5000, description: 'Amount in NGN' })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty({ example: 'John Doe' })
  @IsNotEmpty()
  @IsString()
  bank_holder_name: string;

  @ApiPropertyOptional({ example: 'Wallet withdrawal' })
  @IsOptional()
  @IsString()
  narration?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Persist this account as a reusable beneficiary',
  })
  @IsOptional()
  @IsBoolean()
  save_beneficiary?: boolean | null;
}

/**
 * Body for POST /agent/payout/name-enquiry (frontend `resolveAccountNumber`).
 * Field names match the frontend exactly so validation errors surface under
 * `errors.account_number` / `errors.bank_code` in the 422 response.
 */
export class ResolveAccountDto {
  @ApiProperty({ example: '0123456789' })
  @IsNotEmpty({ message: 'Account number is required' })
  @IsString()
  @Matches(/^\d{10}$/, { message: 'Account number must be exactly 10 digits' })
  account_number: string;

  @ApiProperty({ example: '058', description: 'Bank code from the bank list' })
  @IsNotEmpty({ message: 'Please select a bank' })
  @IsString()
  bank_code: string;
}