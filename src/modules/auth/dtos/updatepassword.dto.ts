import { ApiProperty } from '@nestjs/swagger';
import { Match } from '@shared/decorators/match.decorator';
import { IsNotEmpty, IsString, MinLength, Matches } from 'class-validator';

export class UpdatePasswordDto {
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
  @Matches(/^(?=.*[a-zA-Z])/, {
    message: 'The password field must contain at least one letter.',
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