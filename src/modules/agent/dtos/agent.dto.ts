import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUrl,
  Matches,
  Min,
  MinLength,
} from 'class-validator';
import { Match } from '@shared/decorators/match.decorator';


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

export class UpdateAgentProfileDto {
  @ApiPropertyOptional({ example: 'John' })
  @IsOptional() @IsString() firstName?: string;

  @ApiPropertyOptional({ example: 'Doe' })
  @IsOptional() @IsString() lastName?: string;

  @ApiPropertyOptional({ example: '+2348012345678' })
  @IsOptional() @IsString() phone?: string;

  @ApiPropertyOptional({ example: 'https://res.cloudinary.com/.../image.jpg' })
  @IsOptional() @IsString() profileImage?: string;

  @ApiPropertyOptional({ example: '12 Allen Avenue' })
  @IsOptional() @IsString() address?: string;

  @ApiPropertyOptional({ example: 'Ikeja' })
  @IsOptional() @IsString() city?: string;

  @ApiPropertyOptional({ example: 'Lagos' })
  @IsOptional() @IsString() stateOfResidence?: string;
}

export class CreateTransactionPinDto {
  @ApiProperty({ example: '1234', description: '4 digit transaction pin' })
  @IsNotEmpty({ message: 'Pin is required' })
  @IsString()
  @Matches(/^\d{4}$/, { message: 'Pin must be exactly 4 digits' })
  pin: string;

  @ApiProperty({ example: '1234' })
  @IsNotEmpty({ message: 'Confirm your pin' })
  @IsString()
  @Match('pin', { message: 'Pins must match' })
  pin_confirmation: string;
}

export class AgentUpdatePasswordDto {
  @ApiProperty()
  @IsNotEmpty({ message: 'Enter your current password' })
  @IsString()
  current_password: string;

  @ApiProperty()
  @IsString({ message: 'Password is required' })
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])/, {
    message:
      'The password field must contain at least one uppercase and one lowercase letter.',
  })
  @Matches(/^(?=.*[!@#$%^&*(),.?":{}|<>])/, {
    message: 'The password field must contain at least one symbol.',
  })
  password: string;

  @ApiProperty()
  @IsNotEmpty({ message: 'Confirm your password' })
  @IsString()
  @Match('password', { message: 'Passwords must match' })
  password_confirmation: string;
}
// import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
// import {
//   IsEmail,
//   IsNotEmpty,
//   IsNumber,
//   IsOptional,
//   IsPositive,
//   IsString,
//   IsUrl,
//   Min,
// } from 'class-validator';


// export class AgentRefer{
//   @ApiProperty({ example: 'uuid' })
//   @IsNotEmpty() @IsString() driverId: string;

//   @ApiProperty({ example: 'string' })
//   @IsNotEmpty() @IsString() referralCode: string;


  
// }

// export class UpdateAgentBankDto {
//   @ApiProperty({ example: 'John Doe' })
//   @IsNotEmpty() @IsString() bankAccountName: string;

//   @ApiProperty({ example: '0123456789' })
//   @IsNotEmpty() @IsString() bankAccountNumber: string;

//   @ApiProperty({ example: '058', description: 'Bank code from bank list' })
//   @IsNotEmpty() @IsString() bankCode: string;
// }

// export class AgentWithdrawDto {
//   @ApiProperty({ example: 5000, description: 'Amount in NGN (minimum 1000)' })
//   @IsPositive() @IsNumber() amount: number;

//   @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
// }

// export class AgentQueryDto {
//   @ApiPropertyOptional() @IsOptional() @IsNumber() page?: number;
//   @ApiPropertyOptional() @IsOptional() @IsNumber() limit?: number;
//   @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
// }
