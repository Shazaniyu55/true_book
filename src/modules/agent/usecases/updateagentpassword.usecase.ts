import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { AgentService } from '../services/agent.service';
import { AgentUpdatePasswordDto } from '../dtos/agent.dto';

@Injectable()
export class UpdateAgentPasswordUsecase extends Usecase {
  constructor(private readonly agentService: AgentService) { super(); }

  async execute(
    _em: EntityManager,
    args: { userId: string; dto: AgentUpdatePasswordDto },
  ) {
    return this.agentService.updatePassword(args.userId, args.dto);
  }
}