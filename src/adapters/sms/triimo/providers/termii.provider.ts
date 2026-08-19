import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { SmsPayload } from '../../sms.interface';
import { ITriimo } from '../termii.interface';

@Injectable()
export class TriimoProvider implements ITriimo {
  private readonly client: AxiosInstance;
  private readonly logger = new Logger(TriimoProvider.name);
  private readonly apiKey: string;
  private readonly senderId: string;

  constructor(private readonly configService: ConfigService) {
    const baseUrl = this.configService.get<string>('common.sms.triimo.baseUrl') || 'https://api.triimo.com';
    this.apiKey = this.configService.get<string>('common.triimo.apiKey');
    this.senderId = this.configService.get<string>('common.triimo.senderId') || 'TruBooker';

    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 30_000,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    });
  }

  async sendSms(payload: SmsPayload): Promise<boolean> {
    try {
      const { data } = await this.client.post('/v1/sms/otp', {
        to: this.normalize(payload.destination),
        from: this.senderId,
        sms: payload.message,
        type: 'plain',
        channel: 'generic',
        api_key: this.apiKey,
      });

      const ok = data?.code === 'ok' || !!data?.message_id;
      if (ok) {
        this.logger.log(`Triimo SMS sent to ${this.mask(payload.destination)}`);
      } else {
        this.logger.warn('Triimo SMS response indicates failure', data);
      }
      return ok;
    } catch (error) {
      this.logger.error('Triimo SMS error', error?.response?.data || error?.message);
      return false;
    }
  }

  /** Triimo expects international format with no leading "+" (e.g. 2348012345678) */
  private normalize(phone: string): string {
    return phone.replace(/^\+/, '').replace(/^0/, '234');
  }

  private mask(phone: string): string {
    return phone.slice(0, 4) + '****' + phone.slice(-3);
  }
}