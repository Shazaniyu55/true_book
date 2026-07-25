import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, IsString, IsUUID, Length, Min } from 'class-validator';

export class InitiatePayoutDto {
  @ApiProperty({ example: 5000, description: 'Amount in NGN' })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiPropertyOptional() @IsOptional() @IsString() narration?: string;

  @ApiPropertyOptional() @IsOptional() @IsUUID() beneficiaryId?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @Length(10, 10) accountNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bankCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bankName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bankHolderName?: string;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() refund?: boolean;

  @ApiPropertyOptional({ description: 'Persist this account as a reusable beneficiary (default true)' })
  @IsOptional() @IsBoolean() saveBeneficiary?: boolean;
}

// import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
// import { Type } from 'class-transformer';
// import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, IsUUID, Length, Min } from 'class-validator';

// export class InitiatePayoutDto {
//   @ApiProperty({ example: 5000, description: 'Amount in NGN' })
//   @Type(() => Number)
//   @IsNumber()
//   @Min(1)
//   amount: number;

//   @ApiPropertyOptional() @IsOptional() @IsString() narration?: string;

//   @ApiPropertyOptional() @IsOptional() @IsUUID() beneficiaryId?: string;

//   @ApiPropertyOptional() @IsOptional() @IsString() @Length(10, 10) accountNumber?: string;
//   @ApiPropertyOptional() @IsOptional() @IsString() bankCode?: string;
//   @ApiPropertyOptional() @IsOptional() @IsString() bankName?: string;
//   @ApiPropertyOptional() @IsOptional() @IsString() bankHolderName?: string;

//   @ApiPropertyOptional() @IsOptional() @IsBoolean() refund?: boolean;
// }