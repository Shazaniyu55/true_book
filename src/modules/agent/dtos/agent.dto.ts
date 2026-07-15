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


export class AgentRefer{
  @ApiProperty({ example: 'uuid' })
  @IsNotEmpty() @IsString() driverId: string;

  @ApiProperty({ example: 'string' })
  @IsNotEmpty() @IsString() referralCode: string;


  
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
