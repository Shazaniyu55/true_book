import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { AgentService } from '../services/agent.service';

@Injectable()
export class ReferDriverUsecase extends Usecase {
  constructor(private readonly agentService: AgentService) { super(); }

  async execute(
    _em: EntityManager,
    args: { agentId: string, driverId:string, referralCode:string},
  ) {
    return this.agentService.referDriver(args.agentId, args.driverId, args.referralCode);
  }
}