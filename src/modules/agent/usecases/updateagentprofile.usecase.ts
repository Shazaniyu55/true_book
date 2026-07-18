import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { AgentService } from '../services/agent.service';
import { UpdateAgentProfileDto } from '../dtos/agent.dto';

@Injectable()
export class UpdateAgentProfileUsecase extends Usecase {
  constructor(private readonly agentService: AgentService) { super(); }

  async execute(
    _em: EntityManager,
    args: { userId: string; dto: UpdateAgentProfileDto },
  ) {
    return this.agentService.updateProfile(args.userId, args.dto);
  }
}