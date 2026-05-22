import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class ValidIdDto {
  @ApiProperty({ type: 'string', example: '1234-5678-90123-1234' })
  @IsNotEmpty()
  @IsString()
  @IsUUID(4)
  id: string;
}
