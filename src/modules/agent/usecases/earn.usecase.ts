import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { AgentService } from '../services/agent.service';

@Injectable()
export class EarnFromDriverUsecase extends Usecase {
  constructor(private readonly agentService: AgentService) { super(); }

  async execute(
    _em: EntityManager,
    args: { tripId: string},
  ) {
    return this.agentService.earnFromDriversTrip(args.tripId);
  }
}