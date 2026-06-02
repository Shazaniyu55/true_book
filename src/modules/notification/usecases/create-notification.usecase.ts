import { Injectable } from '@nestjs/common';
import { NotificationService } from '../services/notification.service';
import { CreateNotificationDto } from '../dtos/create-notification.dto';

@Injectable()
export class CreateNotificationUseCase {
  constructor(private readonly notificationService: NotificationService) {}

  async execute(args:{id: string, dto: CreateNotificationDto}) {
    return this.notificationService.createNotification(args.id, args.dto);
  }
}