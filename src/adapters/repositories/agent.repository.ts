import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Agent } from '@modules/core/entities/agent.entity';
import { User } from '@modules/core/entities/user.entity';

@Injectable()
export class AgentRepository extends Repository<Agent> {
  constructor(
    @InjectRepository(Agent)
    private readonly agentRepository: Repository<Agent>,
    private readonly entityManager: EntityManager,

        @InjectRepository(User)private readonly userRepository: Repository<User>,
  ) {
    super(agentRepository.target, agentRepository.manager, agentRepository.queryRunner);
  }

    async createAgent(data: Partial<Agent>, entityManager?: EntityManager): Promise<Agent> {
      const manager = entityManager || this.entityManager;
      const agent = manager.create(Agent, data);
      return manager.save(Agent, agent);
    }

  async findByEmail(email: string): Promise<User | null> {
  return this.userRepository.findOne({
    where: {
      email: email.toLowerCase(),
    },
  });
}
  
    async findByUserId(id: string): Promise<Agent> {
      return this.findOne({ where: { userId: id }, relations: ['user'] });
    }
  
    async updateDriver(id: string, data: Partial<Agent>, entityManager?: EntityManager): Promise<Agent> {
      const manager = entityManager || this.entityManager;
      await manager.update(Agent, id, data);
      return manager.findOne(Agent, { where: { id } });
    }

}
