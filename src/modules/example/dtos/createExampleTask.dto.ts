import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

import { ExampleTaskStatus } from '@modules/core/entities/example.entity';

export class CreateExampleTaskDto {
  @ApiProperty({ example: 'Create onboarding checklist' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ example: 'A short task used to demonstrate the boilerplate layers.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: ExampleTaskStatus, example: ExampleTaskStatus.DRAFT })
  @IsOptional()
  @IsEnum(ExampleTaskStatus)
  status?: ExampleTaskStatus;

  @ApiPropertyOptional({
    type: 'object',
    example: { source: 'readme', owner: 'platform' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
