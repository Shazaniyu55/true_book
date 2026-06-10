import { Injectable } from '@nestjs/common';
import { NotificationService } from '../services/notification.service';
import { EntityManager } from 'typeorm';

@Injectable()
export class MarkOneNotificationUseCase {
  constructor(private readonly notificationService: NotificationService) {}

  async execute(_entityManager: EntityManager, args: {notifyId: string, id:string}) {
    return this.notificationService.markOneAsRead(args.notifyId, args.id);
  }
}