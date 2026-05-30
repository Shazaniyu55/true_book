import { Injectable, Logger } from '@nestjs/common';
import { DojahSendSmsPayload, IDojah } from './dojah.interface';
import { DojahProvider } from './providers/dojah.provider';
import { DojahVerificationResult, DojahVerifyBvnPayload, DojahVerifyLicensePayload, DojahVerifyNinPayload } from '../../../types/interfaces';

@Injectable()
export class DojahAdapter implements IDojah {
  private readonly logger = new Logger(DojahAdapter.name);

  constructor(private readonly dojahProvider: DojahProvider) {}

  verifyBvn(payload: DojahVerifyBvnPayload): Promise<DojahVerificationResult> {
    return this.dojahProvider.verifyBvn(payload);
  }

  verifyNin(payload: DojahVerifyNinPayload): Promise<DojahVerificationResult> {
    return this.dojahProvider.verifyNin(payload);
  }

  verifyDriversLicense(payload: DojahVerifyLicensePayload): Promise<DojahVerificationResult> {
    return this.dojahProvider.verifyDriversLicense(payload);
  }

  sendSms(payload: DojahSendSmsPayload){
    return this.dojahProvider.sendSms(payload)
  }
}
