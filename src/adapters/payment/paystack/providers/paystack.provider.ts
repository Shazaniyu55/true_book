import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import * as crypto from 'crypto';
import { IPaystack } from '../paystack.interface';
import {
  BankListItem,
  NameEnquiryResponse,
  PaymentInitiatePayload,
  PaymentVerifyResponse,
  PayoutPayload,
} from '../../../../types/interfaces';

@Injectable()
export class PaystackProvider implements IPaystack {
  private readonly client: AxiosInstance;
  private readonly logger = new Logger(PaystackProvider.name);
  private readonly secretKey: string;

  constructor(private readonly configService: ConfigService) {
    this.secretKey = this.configService.get<string>('common.payment.paystack.secretKey');
    const baseUrl =
      this.configService.get<string>('common.payment.paystack.baseUrl') ||
      'https://api.paystack.co';

    this.client = axios.create({
      baseURL: baseUrl,
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async initiatePayment(payload: PaymentInitiatePayload) {
    try {
      const { data } = await this.client.post('/transaction/initialize', {
        amount: Math.round(payload.amount * 100),
        email: payload.email,
        reference: payload.reference,
        callback_url: payload.callback_url,
        metadata: payload.metadata,
      });
      return data.data;
    } catch (error) {
      this.logger.error('Paystack initiate payment error', error?.response?.data);
      throw new Error(error?.response?.data?.message || 'Payment initiation failed');
    }
  }

  async verifyPayment(reference: string): Promise<PaymentVerifyResponse> {
    try {
      const { data } = await this.client.get(`/transaction/verify/${reference}`);
      const tx = data.data;
      return {
        status: tx.status === 'success',
        reference: tx.reference,
        amount: tx.amount / 100,
        gateway_response: tx.gateway_response,
        paid_at: tx.paid_at,
        channel: tx.channel,
        currency: tx.currency,
        customer: { email: tx.customer.email },
      };
    } catch (error) {
      this.logger.error('Paystack verify payment error', error?.response?.data);
      throw new Error(error?.response?.data?.message || 'Payment verification failed');
    }
  }

  async createTransferRecipient(payload: {
    name: string;
    account_number: string;
    bank_code: string;
    currency?: string;
  }): Promise<{ recipient_code: string }> {
    try {
      const { data } = await this.client.post('/transferrecipient', {
        type: 'nuban',
        name: payload.name,
        account_number: payload.account_number,
        bank_code: payload.bank_code,
        currency: payload.currency || 'NGN',
      });
      return { recipient_code: data.data.recipient_code };
    } catch (error) {
      this.logger.error('Paystack create recipient error', error?.response?.data);
      throw new Error(error?.response?.data?.message || 'Failed to create transfer recipient');
    }
  }

  async initiatePayout(payload: PayoutPayload): Promise<{ transfer_code: string; status: string }> {
    try {
      const { data } = await this.client.post('/transfer', {
        source: 'balance',
        amount: Math.round(payload.amount * 100),
        recipient: payload.recipient_code,
        reason: payload.reason || 'Payout',
      });
      return { transfer_code: data.data.transfer_code, status: data.data.status };
    } catch (error) {
      this.logger.error('Paystack payout error', error?.response?.data);
      throw new Error(error?.response?.data?.message || 'Payout failed');
    }
  }

  async getBankList(): Promise<BankListItem[]> {
    try {
      const { data } = await this.client.get('/bank?country=nigeria&perPage=100');
      return data.data.map((bank: any) => ({ name: bank.name, code: bank.code, slug: bank.slug }));
    } catch (error) {
      this.logger.error('Paystack get banks error', error?.response?.data);
      throw new Error('Failed to fetch bank list');
    }
  }

  async nameEnquiry(account_number: string, bank_code: string): Promise<NameEnquiryResponse> {
    try {
      const { data } = await this.client.get(
        `/bank/resolve?account_number=${account_number}&bank_code=${bank_code}`,
      );
      return {
        account_name: data.data.account_name,
        account_number: data.data.account_number,
        bank_code,
      };
    } catch (error) {
      this.logger.error('Paystack name enquiry error', error?.response?.data);
      throw new Error(error?.response?.data?.message || 'Account resolution failed');
    }
  }

verifyWebhookSignature(payload: string, signature: string): boolean {
  if (!signature) return false;
  const hash = crypto
    .createHmac('sha512', this.secretKey)
    .update(payload)
    .digest('hex');
  const a = Buffer.from(hash);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

  async initiateRefund(reference: string, amount?: number): Promise<boolean> {
    try {
      const body: any = { transaction: reference };
      if (amount) body.amount = Math.round(amount * 100);
      const { data } = await this.client.post('/refund', body);
      return data.status;
    } catch (error) {
      this.logger.error('Paystack refund error', error?.response?.data);
      throw new Error(error?.response?.data?.message || 'Refund failed');
    }
  }
}
