import { Injectable, Logger } from '@nestjs/common';
import { ITermii } from './termii.interface';
import { TermiiProvider } from './providers/termii.provider';
import { SmsPayload } from '../sms.interface';

@Injectable()
export class TermiiAdapter implements ITermii {
  private readonly logger = new Logger(TermiiAdapter.name);

  constructor(private readonly termiiProvider: TermiiProvider) {}

  sendSms(payload: SmsPayload): Promise<boolean> {
    return this.termiiProvider.sendSms(payload);
  }
}