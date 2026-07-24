import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { DojahAdapter } from '@adapters/kyc/dojah/dojah.adapter';
import { KycService } from '../service/kyc.service';
import { LICENSE_QUEUE, LicenseJobData } from './kyc.queue';

@Processor(LICENSE_QUEUE)
export class LicenseProcessor extends WorkerHost {
  private readonly logger = new Logger(LicenseProcessor.name);

  constructor(
    private readonly dojah: DojahAdapter,
    private readonly kyc: KycService,
  ) {
    super();
  }

  async process(job: Job<LicenseJobData>): Promise<void> {
    const { driverId, driversLicense } = job.data;

    let result;
    try {
      result = await this.dojah.verifyDriversLicenseViaImage({ driversLicense });
    } catch (e: any) {
      if (e.retryable) {
        // Throw → BullMQ retries this job with exponential backoff.
        this.logger.warn(`Dojah transient error for driver ${driverId} (attempt ${job.attemptsMade + 1}) — will retry`);
        throw e;
      }
      // Permanent provider error (not a 502/timeout) — reject now, no point retrying.
      await this.kyc.finalizeLicenseRejected(driverId, e.message ?? 'Verification failed');
      return;
    }

    if (!result.valid) {
      // Dojah answered cleanly: the document itself is invalid. Permanent.
      const reason = result?.entity?.status?.reason ?? 'NOT_VALID';
      await this.kyc.finalizeLicenseRejected(driverId, reason);
      return;
    }

    await this.kyc.finalizeLicenseVerified(driverId, result.entity ?? {});
    this.logger.log(`Licence verified for driver ${driverId}`);
  }

  // Fires after the LAST retry attempt fails (e.g. Dojah was down for the whole window).
  @OnWorkerEvent('failed')
  async onFailed(job: Job<LicenseJobData>, err: Error) {
    if (job.attemptsMade < (job.opts.attempts ?? 1)) return; // still has retries left
    this.logger.error(`Licence job exhausted retries for driver ${job.data.driverId}: ${err.message}`);
    await this.kyc.finalizeLicenseRejected(
      job.data.driverId,
      'Verification service was unavailable. Please try again later.',
    );
  }
}