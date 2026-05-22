import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationType } from '../../../types/enums';

export class CreateNotificationDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  userId: number;

  @ApiProperty({ example: 'Notification Title' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'This is a notification body.' })
  @IsString()
  body: string;

  @ApiProperty({ example: NotificationType.TRIP_BOOKED, enum: NotificationType })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isRead?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  meta?: Record<string, any>;
}
