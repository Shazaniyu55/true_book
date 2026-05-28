import { Injectable } from '@nestjs/common';
import { NotificationRepository } from '@adapters/repositories/notification.repository';
import { CreateNotificationDto } from '../dtos/create-notification.dto';

@Injectable()
export class NotificationService {
  constructor(private readonly notificationRepository: NotificationRepository) {}

  async createNotification(id: string, data: CreateNotificationDto) {
    return this.notificationRepository.createNotification(id, data);
  }

  async getUnreadNotifications(id: string) {
    return this.notificationRepository.findUnreadByUserId(id);
  }

  async getAllNotifications(id: string) {
    return this.notificationRepository.getNotificationsByUserId(id);
  }

  async markAllAsRead(id: string) {
    return this.notificationRepository.markAllReadByUserId(id);
  }

  async deleteNotification(id: string) {
    return this.notificationRepository.deleteNotificationByUserId(id);
  }
}