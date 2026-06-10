import { Injectable } from '@nestjs/common';
import { NotificationService } from '../services/notification.service';
import { EntityManager } from 'typeorm';

@Injectable()
export class GetAllNotificationUseCase {
  constructor(private readonly notificationService: NotificationService) {}

  async execute(_entityManager: EntityManager, arg:{id:string}) {
    return this.notificationService.getAllNotifications(arg.id);
  }
}