import { describe, it, expect, beforeEach } from '@jest/globals';

import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';

import { PaymentService } from '@modules/passenger/services/payment.service';
import { Payment } from '@modules/core/entities/payment.entity';
import { Booking } from '@modules/core/entities/booking.entity';
import { Passenger } from '@modules/core/entities/passenger.entity';
import { PaymentFactory } from '@adapters/payment/payment.factory';
import { CouponService } from '@modules/coupon-referral/service/cupon.service';
import { NotificationService } from '@modules/notification/services/notification.service';
import { RandomnessUtil } from '@shared/utils/encryption/randomness.util';
import { PaymentStatus } from 'src/types/enums';

/**
 * verifyPayment is security-critical: it never trusts the webhook payload, it
 * re-verifies with the gateway, and it refuses to confirm if the paid amount is
 * less than what we expected. These tests pin that contract.
 *
 * We pass a fake EntityManager (`em`) so the real DataSource.transaction is never
 * touched — verifyPayment runs `run(em)` directly.
 */
describe('PaymentService.verifyPayment', () => {
  let service: PaymentService;

  const paymentFactory = { verifyPayment: jest.fn() };
  const notifications = { notify: jest.fn().mockResolvedValue(undefined), notifyAdmins: jest.fn().mockResolvedValue(undefined) };
  const randomness = { generateReference: jest.fn().mockReturnValue('TKT-123') };

  // A fake transactional EntityManager.
  let manager: { findOne: jest.Mock; update: jest.Mock };

  const payment = { id: 'p1', bookingId: 'b1', amount: 1000, status: PaymentStatus.PENDING };
  const booking = {
    id: 'b1',
    bookingCode: 'BK123',
    amountPaid: 1000,
    passenger: { userId: 'pu1' },
    trip: { driverId: 'd1', driver: { userId: 'du1' } },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    manager = {
      findOne: jest.fn((entity: any) =>
        entity === Payment ? payment : entity === Booking ? booking : null,
      ),
      update: jest.fn().mockResolvedValue(undefined),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        PaymentService,
        { provide: getRepositoryToken(Payment), useValue: {} },
        { provide: getRepositoryToken(Booking), useValue: {} },
        { provide: getRepositoryToken(Passenger), useValue: {} },
        { provide: DataSource, useValue: { transaction: jest.fn() } },
        { provide: PaymentFactory, useValue: paymentFactory },
        { provide: CouponService, useValue: {} },
        { provide: NotificationService, useValue: notifications },
        { provide: RandomnessUtil, useValue: randomness },
      ],
    }).compile();

    service = moduleRef.get(PaymentService);
  });

  it('returns false when no pending payment exists for the reference', async () => {
    manager.findOne.mockImplementation((entity: any) => (entity === Payment ? null : booking));

    const ok = await service.verifyPayment('ref', 'card', undefined, [], manager as any);

    expect(ok).toBe(false);
    expect(paymentFactory.verifyPayment).not.toHaveBeenCalled();
    expect(manager.update).not.toHaveBeenCalled();
  });

  it('returns false and confirms nothing when the gateway reports failure', async () => {
    paymentFactory.verifyPayment.mockResolvedValue({ status: false, amount: 1000 });

    const ok = await service.verifyPayment('ref', 'card', undefined, [], manager as any);

    expect(ok).toBe(false);
    expect(manager.update).not.toHaveBeenCalled();
  });

  it('rejects an underpayment (paid amount < expected)', async () => {
    paymentFactory.verifyPayment.mockResolvedValue({ status: true, amount: 500 });

    const ok = await service.verifyPayment('ref', 'card', undefined, [], manager as any);

    expect(ok).toBe(false);
    expect(manager.update).not.toHaveBeenCalled(); // booking must NOT be confirmed
  });

  it('returns false on a transient gateway error and lets the webhook retry', async () => {
    paymentFactory.verifyPayment.mockRejectedValue(new Error('gateway down'));

    const ok = await service.verifyPayment('ref', 'card', undefined, [], manager as any);

    expect(ok).toBe(false);
    expect(manager.update).not.toHaveBeenCalled();
  });

  it('confirms the booking when verification succeeds with a sufficient amount', async () => {
    paymentFactory.verifyPayment.mockResolvedValue({ status: true, amount: 1000 });

    const ok = await service.verifyPayment('ref', 'card', undefined, [], manager as any);

    expect(ok).toBe(true);
    // Payment row + Booking row both updated.
    expect(manager.update).toHaveBeenCalledWith(Payment, payment.id, expect.objectContaining({
      status: PaymentStatus.SUCCESS,
    }));
    expect(manager.update).toHaveBeenCalledWith(Booking, booking.id, expect.objectContaining({
      paymentStatus: PaymentStatus.SUCCESS,
    }));
    // Best-effort notifications fired.
    expect(notifications.notify).toHaveBeenCalled();
  });
});