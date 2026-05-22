import { Injectable } from '@nestjs/common';
import { NotificationRepository } from '@adapters/repositories/notification.repository';
import { CreateNotificationDto } from '../dtos/create-notification.dto';

@Injectable()
export class NotificationService {
  constructor(private readonly notificationRepository: NotificationRepository) {}

  async createNotification(data: CreateNotificationDto) {
    return this.notificationRepository.createNotification(data);
  }

  async getUnreadNotifications(userId: number) {
    return this.notificationRepository.findUnreadByUserId(userId);
  }

  async markAllAsRead(userId: number) {
    return this.notificationRepository.markAllReadByUserId(userId);
  }
}
