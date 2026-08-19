import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DojahAdapter } from '../kyc/dojah/dojah.adapter';
import { BrevoAdapter } from './brevo/brevo.adapter';
import { TriimoAdapter } from './triimo/termii.adapter';
import { ISmsProvider, SmsPayload } from './sms.interface';

const DEFAULT_PROVIDER_ORDER = ['dojah', 'brevo', 'triimo'];

@Injectable()
export class SmsFactory {
  private readonly logger = new Logger(SmsFactory.name);
  private readonly providers: { name: string; provider: ISmsProvider }[];

  constructor(
    private readonly configService: ConfigService,
    private readonly dojahAdapter: DojahAdapter,
    private readonly brevoAdapter: BrevoAdapter,
    private readonly triimoAdapter: TriimoAdapter,
  ) {
    const registry: Record<string, ISmsProvider> = {
      dojah: this.dojahAdapter,
      brevo: this.brevoAdapter,
      triimo: this.triimoAdapter,
    };

    const configuredOrder = (this.configService.get<string>('common.sms.providerOrder') || '')
      .split(',')
      .map((name) => name.trim().toLowerCase())
      .filter(Boolean);

    const order = configuredOrder.length ? configuredOrder : DEFAULT_PROVIDER_ORDER;

    this.providers = order
      .filter((name) => registry[name])
      .map((name) => ({ name, provider: registry[name] }));

    if (this.providers.length === 0) {
      this.logger.warn('No valid SMS_PROVIDER_ORDER configured — defaulting to Dojah only');
      this.providers = [{ name: 'dojah', provider: this.dojahAdapter }];
    }
  }

  async sendSms(payload: SmsPayload): Promise<boolean> {
    const failures: string[] = [];

    for (const { name, provider } of this.providers) {
      try {
        const sent = await provider.sendSms(payload);
        if (sent) {
          this.logger.log(`SMS sent successfully via ${name}`);
          return true;
        }
        this.logger.warn(`${name} failed to send SMS — falling back to next provider`);
        failures.push(`${name}: reported failure`);
      } catch (error) {
        this.logger.warn(`${name} threw while sending SMS — falling back to next provider: ${error?.message}`);
        failures.push(`${name}: ${error?.message || 'unknown error'}`);
      }
    }

    this.logger.error(`All SMS providers failed for destination. Errors: ${failures.join(' | ')}`);
    return false;
  }
}