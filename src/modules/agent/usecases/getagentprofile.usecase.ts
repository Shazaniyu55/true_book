import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { AgentService } from '../services/agent.service';

@Injectable()
export class GetAgentProfileUsecase extends Usecase {
  constructor(private readonly agentService: AgentService) { super(); }

  async execute(_em: EntityManager, args: { userId: string }) {
    return this.agentService.getProfile(args.userId);
  }
}