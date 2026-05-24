import { Injectable } from '@nestjs/common';
import { NotificationRepository } from '@adapters/repositories/notification.repository';
import { CreateNotificationDto } from '../dtos/create-notification.dto';

@Injectable()
export class NotificationService {
  constructor(private readonly notificationRepository: NotificationRepository) {}

  async createNotification(userId: number, data: CreateNotificationDto) {
    return this.notificationRepository.createNotification(userId, data);
  }

  async getUnreadNotifications(userId: number) {
    return this.notificationRepository.findUnreadByUserId(userId);
  }

  async getAllNotifications(userId: number) {
    return this.notificationRepository.getNotificationsByUserId(userId);
  }

  async markAllAsRead(userId: number) {
    return this.notificationRepository.markAllReadByUserId(userId);
  }

  async deleteNotification(userId: number, notificationId: number) {
    return this.notificationRepository.deleteNotificationByUserId(userId, notificationId);
  }
}