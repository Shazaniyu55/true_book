import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { SmsPayload } from '../../sms.interface';
import { IBrevo } from '../brevo.interface';

@Injectable()
export class BrevoProvider implements IBrevo {
  private readonly client: AxiosInstance;
  private readonly logger = new Logger(BrevoProvider.name);
  private readonly sender: string;

  constructor(private readonly configService: ConfigService) {
    const baseUrl = this.configService.get<string>('common.sms.brevo.baseUrl') || 'https://api.brevo.com';
    const apiKey = this.configService.get<string>('common.sms.brevo.apiKey');
    this.sender = this.configService.get<string>('common.sms.brevo.sender') || 'TruBooker';

    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 30_000,
      headers: { 'api-key': apiKey, 'Content-Type': 'application/json', Accept: 'application/json' },
    });
  }

  async sendSms(payload: SmsPayload): Promise<boolean> {
    try {
      await this.client.post('/v3/transactionalSMS/sms', {
        sender: this.sender,
        recipient: this.normalize(payload.destination),
        content: payload.message,
        type: 'transactional',
      });
      this.logger.log(`Brevo SMS sent to ${this.mask(payload.destination)}`);
      return true;
    } catch (error) {
      this.logger.error('Brevo SMS error', error?.response?.data || error?.message);
      return false;
    }
  }

  /** Brevo expects international format with no leading "+" (e.g. 2348012345678) */
  private normalize(phone: string): string {
    return phone.replace(/^\+/, '').replace(/^0/, '234');
  }

  private mask(phone: string): string {
    return phone.slice(0, 4) + '****' + phone.slice(-3);
  }
}