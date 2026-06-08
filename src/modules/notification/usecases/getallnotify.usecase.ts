import { Injectable } from '@nestjs/common';
import { NotificationService } from '../services/notification.service';

@Injectable()
export class GetAllNotificationUseCase {
  constructor(private readonly notificationService: NotificationService) {}

  async execute(id:string) {
    return this.notificationService.getAllNotifications(id);
  }
}