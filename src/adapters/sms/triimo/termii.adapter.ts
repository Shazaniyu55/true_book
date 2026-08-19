import { Injectable, Logger } from '@nestjs/common';
import { ITriimo } from './termii.interface';
import { TriimoProvider } from './providers/termii.provider';
import { SmsPayload } from '../sms.interface';

@Injectable()
export class TriimoAdapter implements ITriimo {
  private readonly logger = new Logger(TriimoAdapter.name);

  constructor(private readonly triimoProvider: TriimoProvider) {}

  sendSms(payload: SmsPayload): Promise<boolean> {
    return this.triimoProvider.sendSms(payload);
  }
}