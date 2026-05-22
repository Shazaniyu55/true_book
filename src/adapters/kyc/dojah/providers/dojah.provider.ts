import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { IDojah } from '../dojah.interface';
import { DojahVerificationResult, DojahVerifyBvnPayload, DojahVerifyLicensePayload, DojahVerifyNinPayload } from '../../../../types/interfaces';

@Injectable()
export class DojahProvider implements IDojah {
  private readonly client: AxiosInstance;
  private readonly logger = new Logger(DojahProvider.name);

  constructor(private readonly configService: ConfigService) {
    const baseUrl = this.configService.get<string>('common.kyc.dojah.baseUrl') || 'https://api.dojah.io';
    const appId = this.configService.get<string>('common.kyc.dojah.appId');
    const privateKey = this.configService.get<string>('common.kyc.dojah.privateKey');

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
      const { data } = await this.client.get(
        `/api/v1/kyc/dl?license_number=${payload.license_number}&dob=${payload.date_of_birth}&first_name=${payload.first_name}&last_name=${payload.last_name}`,
      );
      return { entity: data.entity, status: true, message: 'License verified successfully' };
    } catch (error) {
      this.logger.error('Dojah License error', error?.response?.data);
      throw new Error(error?.response?.data?.error || 'License verification failed');
    }
  }
}
