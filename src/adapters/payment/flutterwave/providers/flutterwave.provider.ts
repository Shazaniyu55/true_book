import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { IFlutterwave } from '../flutterwave.interface';
import { BankListItem, NameEnquiryResponse, PaymentInitiatePayload, PaymentVerifyResponse } from '../../../../types/interfaces';

@Injectable()
export class FlutterwaveProvider implements IFlutterwave {
  private readonly client: AxiosInstance;
  private readonly logger = new Logger(FlutterwaveProvider.name);
  private readonly secretKey: string;

  constructor(private readonly configService: ConfigService) {
    this.secretKey = this.configService.get<string>('common.payment.flutterwave.secretKey');
    this.client = axios.create({
      baseURL: 'https://api.flutterwave.com/v3',
      headers: { Authorization: `Bearer ${this.secretKey}`, 'Content-Type': 'application/json' },
    });
  }

  async initiatePayment(payload: PaymentInitiatePayload) {
    try {
      const { data } = await this.client.post('/payments', {
        tx_ref: payload.reference,
        amount: payload.amount,
        currency: 'NGN',
        redirect_url: payload.callback_url,
        customer: { email: payload.email },
        meta: payload.metadata,
      });
      return { authorization_url: data.data.link, access_code: data.data.link, reference: payload.reference };
    } catch (error) {
      this.logger.error('Flutterwave initiate error', error?.response?.data);
      throw new Error(error?.response?.data?.message || 'Payment initiation failed');
    }
  }

  async verifyPayment(transaction_id: string): Promise<PaymentVerifyResponse> {
    try {
      const { data } = await this.client.get(`/transactions/${transaction_id}/verify`);
      const tx = data.data;
      return {
        status: tx.status === 'successful',
        reference: tx.tx_ref,
        amount: tx.amount,
        gateway_response: tx.processor_response,
        paid_at: tx.created_at,
        channel: tx.payment_type,
        currency: tx.currency,
        customer: { email: tx.customer.email, name: tx.customer.name },
      };
    } catch (error) {
      this.logger.error('Flutterwave verify error', error?.response?.data);
      throw new Error(error?.response?.data?.message || 'Payment verification failed');
    }
  }

  async getBankList(): Promise<BankListItem[]> {
    try {
      const { data } = await this.client.get('/banks/NG');
      return data.data.map((b: any) => ({ name: b.name, code: b.code, slug: b.name.toLowerCase().replace(/\s+/g, '-') }));
    } catch (error) {
      throw new Error('Failed to fetch bank list');
    }
  }

  async nameEnquiry(account_number: string, bank_code: string): Promise<NameEnquiryResponse> {
    try {
      const { data } = await this.client.post('/accounts/resolve', { account_number, account_bank: bank_code });
      return { account_name: data.data.account_name, account_number: data.data.account_number, bank_code };
    } catch (error) {
      throw new Error(error?.response?.data?.message || 'Account resolution failed');
    }
  }

  async initiatePayout(payload: { account_number: string; bank_code: string; amount: number; narration?: string; account_name: string; reference: string }) {
    try {
      const { data } = await this.client.post('/transfers', {
        account_bank: payload.bank_code,
        account_number: payload.account_number,
        amount: payload.amount,
        narration: payload.narration || 'Payout',
        currency: 'NGN',
        reference: payload.reference,
        debit_currency: 'NGN',
      });
      return { transfer_code: data.data.id.toString(), status: data.data.status };
    } catch (error) {
      throw new Error(error?.response?.data?.message || 'Payout failed');
    }
  }

  verifyWebhookSignature(payload: string, signature: string): boolean {
    return signature === this.secretKey;
  }
}
