import { Injectable, Logger } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { Usecase } from './types';

@Injectable()
export class Broker {
  private readonly logger = new Logger(Broker.name);

  constructor(@InjectEntityManager() private readonly entityManager: EntityManager) {}

  private static readonly REDACT_KEYS = new Set([
  'password',
  'accessToken',
  'refreshToken',
  'otp',
  'otpCode',
  'phoneOtpCode',
  'token',
]);

private redact(obj: Record<string, any>): Record<string, any> {
  const clone: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    clone[k] = Broker.REDACT_KEYS.has(k) ? '[REDACTED]' : v;
  }
  return clone;
}

  async runUsecases(usecases: Usecase[], initialArguments: Record<string, any> = {}): Promise<any> {
    return this.entityManager.transaction(async (transactionalEntityManager) => {
      this.logger.debug(`Running ${usecases.length} usecases`);
      this.logger.debug(`Initial args: ${JSON.stringify(this.redact(initialArguments))}`);

      let results: any = { ...initialArguments };

      for (const useCase of usecases) {
        this.logger.debug(`Running usecase: ${useCase.constructor.name}`);
        const result = await useCase.execute(transactionalEntityManager, results);

        if (Array.isArray(result)) {
          // A usecase returning a bare array (e.g. a list of documents) is the
          // final payload for that step, not extra context to merge in.
          // Spreading an array into an object (`{...result}`) turns it into
          // `{ "0": item, "1": item, ... }`, which silently breaks any
          // consumer expecting a real array. Replace instead of merging.
          results = result;
        } else {
          results = { ...results, ...result };
        }
      }

      //Remove initial args from results
      if (!Array.isArray(results)) {
        for (const key in initialArguments) {
          if (Object.keys(results).includes(key) || key === 'password') {
            delete results[key];
          }
        }
      }
      this.logger.debug(`Final results: ${JSON.stringify(this.redact(results))}`);
      //this.logger.debug(`Final results: ${JSON.stringify(results)}`);
      return results;
    });
  }
}

// import { Injectable, Logger } from '@nestjs/common';
// import { InjectEntityManager } from '@nestjs/typeorm';
// import { EntityManager } from 'typeorm';
// import { Usecase } from './types';

// @Injectable()
// export class Broker {
//   private readonly logger = new Logger(Broker.name);

//   constructor(@InjectEntityManager() private readonly entityManager: EntityManager) {}

//   private static readonly REDACT_KEYS = new Set([
//   'password',
//   'accessToken',
//   'refreshToken',
//   'otp',
//   'otpCode',
//   'phoneOtpCode',
//   'token',
// ]);

// private redact(obj: Record<string, any>): Record<string, any> {
//   const clone: Record<string, any> = {};
//   for (const [k, v] of Object.entries(obj)) {
//     clone[k] = Broker.REDACT_KEYS.has(k) ? '[REDACTED]' : v;
//   }
//   return clone;
// }

//   async runUsecases(usecases: Usecase[], initialArguments: Record<string, any> = {}): Promise<any> {
//     return this.entityManager.transaction(async (transactionalEntityManager) => {
//       this.logger.debug(`Running ${usecases.length} usecases`);
//       this.logger.debug(`Initial args: ${JSON.stringify(this.redact(initialArguments))}`);

//       let results = { ...initialArguments };

//       for (const useCase of usecases) {
//         this.logger.debug(`Running usecase: ${useCase.constructor.name}`);
//         const result = await useCase.execute(transactionalEntityManager, results);
//         results = { ...results, ...result };
//       }

//       //Remove initial args from results
//       for (const key in initialArguments) {
//         if (Object.keys(results).includes(key) || key === 'password') {
//           delete results[key];
//         }
//       }
//       this.logger.debug(`Final results: ${JSON.stringify(this.redact(results))}`);
//       //this.logger.debug(`Final results: ${JSON.stringify(results)}`);
//       return results;
//     });
//   }
// }
