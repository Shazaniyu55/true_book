import { Injectable } from '@nestjs/common';
import { NotificationService } from '../services/notification.service';
import { CreateNotificationDto } from '../dtos/create-notification.dto';

@Injectable()
export class CreateNotificationUseCase {
  constructor(private readonly notificationService: NotificationService) {}

  async execute(data: CreateNotificationDto) {
    return this.notificationService.createNotification(data);
  }
}
