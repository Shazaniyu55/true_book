import { Injectable } from '@nestjs/common';
import { ExpoService } from '../services/expo.service';

@Injectable()
export class SendPushNotificationUseCase {
  constructor(
    private readonly expoService: ExpoService,
  ) {}

  async execute({
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

    // send push
    await this.expoService.sendPushNotification(expoPushToken, title, body, data);

  }
}
