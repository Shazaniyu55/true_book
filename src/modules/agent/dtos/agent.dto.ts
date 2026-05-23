import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUrl,
  Min,
} from 'class-validator';

export class BookAgentTripDto {
  @ApiProperty({ description: 'Trip ID to book' })
  @IsNotEmpty() @IsNumber() tripId: number;

  @ApiProperty({ description: 'User ID of the passenger being booked for' })
  @IsNotEmpty() @IsNumber() passengerUserId: number;

  @ApiProperty({ description: "Passenger's email for payment link" })
  @IsNotEmpty() @IsEmail() passengerEmail: string;

  @ApiProperty({ description: 'Number of seats to book', minimum: 1 })
  @IsPositive() @Min(1) @IsNumber() seats: number;

  @ApiPropertyOptional({ description: 'Discount coupon code' })
  @IsOptional() @IsString() couponCode?: string;

  @ApiPropertyOptional({ description: 'Payment success redirect URL' })
  @IsOptional() @IsUrl() callbackUrl?: string;
}

export class UpdateAgentBankDto {
  @ApiProperty({ example: 'John Doe' })
  @IsNotEmpty() @IsString() bankAccountName: string;

  @ApiProperty({ example: '0123456789' })
  @IsNotEmpty() @IsString() bankAccountNumber: string;

  @ApiProperty({ example: '058', description: 'Bank code from bank list' })
  @IsNotEmpty() @IsString() bankCode: string;
}

export class AgentWithdrawDto {
  @ApiProperty({ example: 5000, description: 'Amount in NGN (minimum 1000)' })
  @IsPositive() @IsNumber() amount: number;

  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
}

export class AgentQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsNumber() page?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() limit?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
}
