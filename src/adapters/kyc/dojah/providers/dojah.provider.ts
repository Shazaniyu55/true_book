import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { DojahSendSmsPayload, IDojah } from '../dojah.interface';
import { DojahVerificationResult, DojahVerifyBvnPayload, DojahVerifyLicensePayload, DojahVerifyNinPayload } from '../../../../types/interfaces';

@Injectable()
export class DojahProvider implements IDojah {
  private readonly client: AxiosInstance;
  private readonly logger = new Logger(DojahProvider.name);
   private readonly senderId: string;

  constructor(private readonly configService: ConfigService) {
    const baseUrl = this.configService.get<string>('common.kyc.dojah.baseUrl') || 'https://api.dojah.io';
    const appId = this.configService.get<string>('common.kyc.dojah.appId');
    const privateKey = this.configService.get<string>('common.kyc.dojah.privateKey');
      this.senderId = this.configService.get<string>('common.kyc.dojah.senderId') || 'Tru Booker';

    this.client = axios.create({
      baseURL: baseUrl,
      headers: { AppId: appId, Authorization: privateKey, 'Content-Type': 'application/json' },
    });
  }

  async verifyBvn(payload: DojahVerifyBvnPayload): Promise<DojahVerificationResult> {
    try {
      const { data } = await this.client.get(`/api/v1/kyc/bvn/advance?bvn=${payload.bvn}`);
      return { entity: data.entity, status: true, message: 'BVN verified successfully' };
    } catch (error) {
      this.logger.error('Dojah BVN error', error?.response?.data);
      throw new Error(error?.response?.data?.error || 'BVN verification failed');
    }
  }

  async verifyNin(payload: DojahVerifyNinPayload): Promise<DojahVerificationResult> {
    try {
      const { data } = await this.client.get(`/api/v1/kyc/nin?nin=${payload.nin}`);
      return { entity: data.entity, status: true, message: 'NIN verified successfully' };
    } catch (error) {
      this.logger.error('Dojah NIN error', error?.response?.data);
      throw new Error(error?.response?.data?.error || 'NIN verification failed');
    }
  }
async verifyDriversLicense(payload: DojahVerifyLicensePayload): Promise<DojahVerificationResult> {
  try {
    const params: Record<string, string> = {
      license_number: payload.license_number,
      dob: payload.date_of_birth,
    };
    if (payload.insurance !== undefined) {
      params.insurance = String(payload.insurance);
    }
    if (payload.regDocs !== undefined) {
      params.regDocs = String(payload.regDocs);
    }

    const { data } = await this.client.get('/api/v1/kyc/dl', { params });
    return { entity: data.entity, status: true, message: 'License verified successfully' };
  } catch (error) {
    this.logger.error('Dojah License error', error?.response?.data);
    throw new Error(error?.response?.data?.error || 'License verification failed');
  }
}
  // async verifyDriversLicense(payload: DojahVerifyLicensePayload): Promise<DojahVerificationResult> {
  //   try {
  //     const { data } = await this.client.get(
  //       `/api/v1/kyc/dl?license_number=${payload.license_number}&dob=${payload.date_of_birth}&insurance=${payload.insurance}&regDocs=${payload.regDocs}`,
  //     );
  //     return { entity: data.entity, status: true, message: 'License verified successfully' };
  //   } catch (error) {
  //     this.logger.error('Dojah License error', error?.response?.data);
  //     throw new Error(error?.response?.data?.error || 'License verification failed');
  //   }
  // }

  async sendSms(payload: DojahSendSmsPayload): Promise<boolean> {
    try {
      await this.client.post('/api/v1/messaging/sms', {
        channel: 'sms',
        sender_id: this.senderId,
        destination: this.normalize(payload.destination),
        message: payload.message,
      });
      this.logger.log(`Dojah SMS sent to ${this.mask(payload.destination)}`);
      return true;
    } catch (error) {
      this.logger.error('Dojah SMS error', error?.response?.data);
      return false;
    }
  }

    /** Dojah expects international format with no leading "+" (e.g. 2348012345678) */
  private normalize(phone: string): string {
    return phone.replace(/^\+/, '').replace(/^0/, '234');
  }

  private mask(phone: string): string {
    return phone.slice(0, 4) + '****' + phone.slice(-3);
  }
  
}
