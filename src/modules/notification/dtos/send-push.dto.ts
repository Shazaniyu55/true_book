import { IsEnum, IsOptional, IsString } from 'class-validator';
import { NotificationType } from '../../../types/enums';

export class SendPushDto {
  @IsString()
  expoPushToken: string;

  @IsString()
  title: string;

  @IsString()
  body: string;

  @IsEnum(NotificationType)
  type: NotificationType;

  @IsOptional()
  data?: Record<string, any>;
}
