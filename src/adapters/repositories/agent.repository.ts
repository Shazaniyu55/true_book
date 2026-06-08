import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Agent } from '@modules/core/entities/agent.entity';

@Injectable()
export class AgentRepository extends Repository<Agent> {
  constructor(
    @InjectRepository(Agent)
    private readonly agentRepository: Repository<Agent>,
    private readonly entityManager: EntityManager,
  ) {
    super(agentRepository.target, agentRepository.manager, agentRepository.queryRunner);
  }

    async createAgent(data: Partial<Agent>, entityManager?: EntityManager): Promise<Agent> {
      const manager = entityManager || this.entityManager;
      const agent = manager.create(Agent, data);
      return manager.save(Agent, agent);
    }
  
    async findByUserId(id: string): Promise<Agent> {
      return this.findOne({ where: { id }, relations: ['users'] });
    }
  
    async updateDriver(id: string, data: Partial<Agent>, entityManager?: EntityManager): Promise<Agent> {
      const manager = entityManager || this.entityManager;
      await manager.update(Agent, id, data);
      return manager.findOne(Agent, { where: { id } });
    }

}
