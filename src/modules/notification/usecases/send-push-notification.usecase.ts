import { Injectable } from '@nestjs/common';
import { ExpoService } from '../services/expo.service';
import { NotificationService } from '../services/notification.service';
import { NotificationType } from '../../../types/enums';

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
    userId: number;
    expoPushToken: string;
    title: string;
    body: string;
    data?: any;
  }) {
    // save notification in DB
    const notification = await this.notificationService.createNotification({
      userId,
      title,
      body: body,
      type: NotificationType.TRIP_BOOKED,
    });

    // send push
    await this.expoService.sendPushNotification(expoPushToken, title, body, data);

    return notification;
  }
}
