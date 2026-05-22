import { Injectable, Scope } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';

import { EntityManager } from 'typeorm';

@Injectable({ scope: Scope.REQUEST })
export class TransactionProvider {
  constructor(private readonly clsService: ClsService) {}

  setManager(manager: EntityManager): void {
    this.clsService.set('entityManager', manager);
  }

  getManager(): EntityManager {
    return this.clsService.get('entityManager');
  }
}
