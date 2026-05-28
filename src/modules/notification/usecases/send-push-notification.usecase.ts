import { Injectable } from '@nestjs/common';
import { ExpoService } from '../services/expo.service';
import { NotificationService } from '../services/notification.service';

@Injectable()
export class SendPushNotificationUseCase {
  constructor(
    private readonly expoService: ExpoService,
    private readonly notificationService: NotificationService,
  ) {}

  async execute({
    userId,
    expoPushToken,
     title,
     body,
    data,
  }: {
    userId: string;
     expoPushToken: string;
     title: string;
     body: string;
    data?: any;
  }) {
    // save notification in DB
    const notification = await this.notificationService.createNotification(userId, data);

    // send push
    await this.expoService.sendPushNotification(expoPushToken, title, body, data);

    return notification;
  }
}
