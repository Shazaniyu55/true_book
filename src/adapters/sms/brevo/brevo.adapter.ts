import { Injectable, Logger } from '@nestjs/common';
import { IBrevo } from './brevo.interface';
import { BrevoProvider } from './providers/brevo.provider';
import { SmsPayload } from '../sms.interface';

@Injectable()
export class BrevoAdapter implements IBrevo {
  private readonly logger = new Logger(BrevoAdapter.name);

  constructor(private readonly brevoProvider: BrevoProvider) {}

  sendSms(payload: SmsPayload): Promise<boolean> {
    return this.brevoProvider.sendSms(payload);
  }
}