import { describe, it, expect, beforeEach } from '@jest/globals';

import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';

import { PayoutService } from '@modules/driver/services/payout.service';
import { Driver } from '@modules/core/entities/driver.entity';
import { Agent } from '@modules/core/entities/agent.entity';
import { Beneficiary } from '@modules/core/entities/beneficiary.entity';
import { PaystackAdapter } from '@adapters/payment/paystack/paystack.adapter';
import { NotificationService } from '@modules/notification/services/notification.service';
import { RandomnessUtil } from '@shared/utils/encryption/randomness.util';

/**
 * completePayout is the webhook settlement path. It must be idempotent:
 * it atomically CLAIMS a PENDING payout, so a retried (or already-settled)
 * webhook is a harmless no-op. We pass a fake EntityManager to drive the
 * `manager.update(...)` claim result.
 */
describe('PayoutService.completePayout', () => {
  let service: PayoutService;

  const notifications = { notify: jest.fn().mockResolvedValue(undefined) };
  let manager: { update: jest.Mock; findOne: jest.Mock; decrement: jest.Mock };

  beforeEach(async () => {
    jest.clearAllMocks();

    manager = {
      update: jest.fn(),
      findOne: jest.fn(),
      decrement: jest.fn().mockResolvedValue(undefined),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        PayoutService,
        { provide: getRepositoryToken(Driver), useValue: {} },
        { provide: getRepositoryToken(Agent), useValue: {} },
        { provide: getRepositoryToken(Beneficiary), useValue: {} },
        { provide: DataSource, useValue: { transaction: jest.fn() } },
        { provide: PaystackAdapter, useValue: {} },
        { provide: NotificationService, useValue: notifications },
        { provide: RandomnessUtil, useValue: {} },
      ],
    }).compile();

    service = moduleRef.get(PayoutService);
  });

  it('skips (returns false) when the payout is not PENDING — claim affects 0 rows', async () => {
    manager.update.mockResolvedValue({ affected: 0 });

    const result = await service.completePayout('payout-ref-1', manager as any);

    expect(result).toBe(false);
    // No balance change and no notification on a no-op.
    expect(manager.decrement).not.toHaveBeenCalled();
    expect(notifications.notify).not.toHaveBeenCalled();
  });

  it('settles a pending driver payout: debits the wallet and notifies', async () => {
    manager.update.mockResolvedValue({ affected: 1 }); // claim succeeds
    manager.findOne.mockResolvedValue({
      id: 'po1',
      reference: 'payout-ref-2',
      amount: 5000,
      driverId: 'd1',
      driver: { userId: 'du1' },
      agent: null,
    });

    const result = await service.completePayout('payout-ref-2', manager as any);

    expect(result).toBe(true);
    expect(manager.decrement).toHaveBeenCalledWith(Driver, { id: 'd1' }, 'currentBalance', 5000);
    expect(notifications.notify).toHaveBeenCalled();
  });
});