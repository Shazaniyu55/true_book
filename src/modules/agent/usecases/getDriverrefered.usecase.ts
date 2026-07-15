import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { AgentService } from '../services/agent.service';
import { AgentQueryDto } from '../dtos/agent.dto';

@Injectable()
export class GetDriverReferedUsecase extends Usecase {
  constructor(private readonly agentService: AgentService) { super(); }

  async execute(
    _em: EntityManager,
    args: { agentId: string, dto: AgentQueryDto},
  ) {
    return this.agentService.getDriversReferred(args.agentId, args.dto);
  }
}