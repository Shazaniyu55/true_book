import { DojahVerificationResult, DojahVerifyBvnPayload, DojahVerifyLicensePayload, DojahVerifyNinPayload } from '../../../types/interfaces';

export interface DojahSendSmsPayload {
  destination: string;
  message: string;
}

export interface IDojah {
  verifyBvn(payload: DojahVerifyBvnPayload): Promise<DojahVerificationResult>;
  verifyNin(payload: DojahVerifyNinPayload): Promise<DojahVerificationResult>;
  verifyDriversLicense(payload: DojahVerifyLicensePayload): Promise<DojahVerificationResult>;
}
