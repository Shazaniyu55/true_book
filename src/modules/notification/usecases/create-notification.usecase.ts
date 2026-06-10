import { Injectable } from '@nestjs/common';
import { NotificationService, NotifyParams } from '../services/notification.service';
import { EntityManager } from 'typeorm';

@Injectable()
export class CreateNotificationUseCase {
  constructor(private readonly notificationService: NotificationService) {}

  async execute(_entityManager: EntityManager,args:NotifyParams) {
    return this.notificationService.notify(args);
  }
}