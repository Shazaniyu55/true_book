export interface SmsPayload {
  destination: string;
  message: string;
}

/**
 * Every SMS provider (Dojah, Brevo, Termii, ...) implements this contract so the
 * SmsFactory can treat them interchangeably when failing over between providers.
 */
export interface ISmsProvider {
  sendSms(payload: SmsPayload): Promise<boolean>;
}