import { Injectable, BadRequestException } from '@nestjs/common';
import { Expo, ExpoPushMessage } from 'expo-server-sdk';

@Injectable()
export class ExpoService {
  private expo: Expo;

  constructor() {
    this.expo = new Expo();
  }

  async sendPushNotification(token: string, title: string, body: string, data?: any) {
    if (!Expo.isExpoPushToken(token)) {
      throw new BadRequestException('Invalid Expo push token');
    }

    const messages: ExpoPushMessage[] = [
      {
        to: token,
        sound: 'default',
        title,
        body,
        data,
      },
    ];

    const chunks = this.expo.chunkPushNotifications(messages);

    const tickets = [];

    for (const chunk of chunks) {
      const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
    }

    return tickets;
  }
}