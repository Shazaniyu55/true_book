import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import {
  otpEmailTemplate,
  passwordResetTemplate,
  welcomeEmailTemplate,
} from './templates';
import { SendEmailDto, SendOtpEmailDto, SendWelcomeEmailDto } from './dtos/send-email.dto';

export interface EmailResult {
  id: string;
  success: boolean;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly client: Resend;
  private readonly from: string;
  private readonly otpExpiryMinutes: number;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('common.resend.apiKey');
    this.from =
      this.configService.get<string>('common.resend.fromEmail') ??
      'Tru Booker <noreply@trubooker.ng>';
    this.otpExpiryMinutes =
      this.configService.get<number>('common.otp.durationMinutes') ?? 10;

    this.client = new Resend(apiKey);
  }

  async send(dto: SendEmailDto): Promise<EmailResult> {
    try {
      const { data, error } = await this.client.emails.send({
        from: this.from,
        to: dto.to,
        subject: dto.subject,
        html: dto.html,
        ...(dto.text ? { text: dto.text } : {}),
      });

      if (error) {
        this.logger.error(`Email failed to ${dto.to}: ${error.message}`);
        return { id: '', success: false };
      }

      this.logger.log(`Email sent to ${dto.to} — id: ${data.id}`);
      return { id: data.id, success: true };
    } catch (err) {
      this.logger.error(`Email exception to ${dto.to}`, err);
      return { id: '', success: false };
    }
  }

  async sendOtp(dto: SendOtpEmailDto): Promise<EmailResult> {
    return this.send({
      to: dto.to,
      subject: `${dto.purpose ? `[${dto.purpose}] ` : ''}Your verification code`,
      html: otpEmailTemplate({
        firstName: dto.firstName,
        otp: dto.otp,
        expiryMinutes: this.otpExpiryMinutes,
        purpose: dto.purpose,
      }),
    });
  }

  async sendWelcome(dto: SendWelcomeEmailDto): Promise<EmailResult> {
    return this.send({
      to: dto.to,
      subject: 'Welcome to Tru Booker ',
      html: welcomeEmailTemplate({
        firstName: dto.firstName,
        role: dto.role,
        loginUrl: dto.loginUrl,
      }),
    });
  }

  async sendPasswordReset(params: {
    to: string;
    firstName: string;
    otp: string;
  }): Promise<EmailResult> {
    return this.send({
      to: params.to,
      subject: 'Reset your Tru Booker password',
      html: passwordResetTemplate({
        firstName: params.firstName,
        otp: params.otp,
        expiryMinutes: this.otpExpiryMinutes,
      }),
    });
  }
}