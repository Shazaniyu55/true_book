import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { AgentService } from '../services/agent.service';
import { CreateTransactionPinDto } from '../dtos/agent.dto';

@Injectable()
export class CreateTransactionPinUsecase extends Usecase {
  constructor(private readonly agentService: AgentService) { super(); }

  async execute(
    _em: EntityManager,
    args: { userId: string; dto: CreateTransactionPinDto },
  ) {
    return this.agentService.createTransactionPin(args.userId, args.dto);
  }
}