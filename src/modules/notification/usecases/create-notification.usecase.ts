import { Injectable } from '@nestjs/common';
import { NotificationService, NotifyParams } from '../services/notification.service';

@Injectable()
export class CreateNotificationUseCase {
  constructor(private readonly notificationService: NotificationService) {}

  async execute(args:NotifyParams) {
    return this.notificationService.notify(args);
  }
}