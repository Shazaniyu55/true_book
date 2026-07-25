import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { PayoutService } from '@modules/driver/services/payout.service';
import { AgentInitiatePayoutDto } from '../dtos/agent-payout.dto';

/**
 * Bridges the agent-facing (snake_case) payout request to the shared,
 * driver/agent-aware PayoutService. Agents don't dispense immediately —
 * the service records the payout as PENDING and waits for admin approval.
 */
@Injectable()
export class InitiateAgentPayoutUsecase extends Usecase {
  constructor(private readonly payoutService: PayoutService) {
    super();
  }

  async execute(
    _em: EntityManager,
    args: { userId: string; dto: AgentInitiatePayoutDto },
  ) {
    const { userId, dto } = args;

    return this.payoutService.initiatePayout(userId, {
      amount: dto.amount,
      narration: dto.narration ?? 'Wallet withdrawal',
      beneficiaryId: dto.beneficiary_id ?? undefined,
      accountNumber: dto.account_number,
      bankCode: dto.bank_code,
      bankName: dto.bank_name,
      bankHolderName: dto.bank_holder_name,
      saveBeneficiary: dto.save_beneficiary ?? true,
    });
  }
}