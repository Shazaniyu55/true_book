import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';
import { Transform } from 'class-transformer';
import validator from 'validator';

export class EmailDto {
  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'Email address',
  })
  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail(
    {
      require_display_name: false,
      require_tld: true,
    },
    { message: 'Invalid email' },
  )
  @Transform(({ value }) => {
    if (value) return validator.normalizeEmail(value);
  })
  email: string;
}
