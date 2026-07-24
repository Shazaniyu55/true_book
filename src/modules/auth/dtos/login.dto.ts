import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';
import { Transform } from 'class-transformer';

export class LoginDto {
  @ApiProperty({ example: 'john@example.com' })
  @IsNotEmpty()
  @IsEmail()
  @Transform(({ value }) => value?.toLowerCase()?.trim())
  email: string;

  @ApiProperty({ example: 'Password123' })
  @IsNotEmpty()
  @IsString()
  password: string;

  @IsOptional()
  @IsString()
  @Matches(/^ExponentPushToken\[.+\]$/, { message: 'Invalid Expo push token' })
  expo_token?: string;
}
