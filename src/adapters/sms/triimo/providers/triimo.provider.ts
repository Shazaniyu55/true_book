import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { SmsPayload } from '../../sms.interface';
import { ITriimo } from '../triimo.interface';

@Injectable()
export class TriimoProvider implements ITriimo {
  private readonly client: AxiosInstance;
  private readonly logger = new Logger(TriimoProvider.name);
  private readonly apiKey: string;
  private readonly senderId: string;
  private readonly orgId: string;

  constructor(private readonly configService: ConfigService) {
    const baseUrl = this.configService.get<string>('common.sms.triimo.baseUrl') || 'https://server.triimo.com';
    this.apiKey = this.configService.get<string>('common.triimo.apiKey');
    this.senderId = this.configService.get<string>('common.triimo.senderId') || 'TruBooker';
    this.orgId = this.configService.get<string>('common.triimo.orgId');


    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 30_000,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json',  'x-org-id': this.orgId,'x-api-key': this.apiKey, },
    });
  }

  // async sendSms(payload: SmsPayload): Promise<boolean> {
  //   try {
  //     const { data } = await this.client.post('/api/v1/otp/send', {
  //       to: this.normalize(payload.destination),
  //       from: this.senderId,
  //       sms: payload.message,
  //       type: 'plain',
  //       channel: 'generic',
  //       api_key: this.apiKey,
  //     });

  //     const ok = data?.code === 'ok' || !!data?.message_id;
  //     if (ok) {
  //       this.logger.log(`Triimo SMS sent to ${this.mask(payload.destination)}`);
  //     } else {
  //       this.logger.warn('Triimo SMS response indicates failure', data);
  //     }
  //     return ok;
  //   } catch (error) {
  //     this.logger.error('Triimo SMS error', error?.response?.data || error?.message);
  //     return false;
  //   }
  // }
async sendSms(payload: SmsPayload): Promise<boolean> {
  try {
    const { data } = await this.client.post('/api/v1/otp/send', {
      expiry: 5,                               // minutes – adjust as needed
      length: 6,                               // OTP length – adjust as needed
      messageTemplate: payload.message,        // the full SMS text
      phoneNumber: this.normalize(payload.destination),
      recipientName: this.normalize(payload.destination) || 'Customer', // use phone as recipient name
      type: 'numeric',                         // or 'alphabets' – choose based on OTP needs
    });

    // Check success – adjust based on actual response structure
    const ok = data?.success === true || !!data?.otpId;
    if (ok) {
      this.logger.log(`Triimo OTP sent to ${this.mask(payload.destination)}`);
    } else {
      this.logger.warn('Triimo OTP response indicates failure', data);
    }
    return ok;
  } catch (error) {
    this.logger.error('Triimo OTP error', error?.response?.data || error?.message);
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