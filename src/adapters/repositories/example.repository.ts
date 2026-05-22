import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, FindManyOptions, Repository } from 'typeorm';

import { ExampleTask } from '@modules/core/entities/example.entity';

@Injectable()
export class ExampleTaskRepository extends Repository<ExampleTask> {
  constructor(
    @InjectRepository(ExampleTask)
    private readonly exampleTaskRepository: Repository<ExampleTask>,
    private readonly entityManager: EntityManager,
  ) {
    super(
      exampleTaskRepository.target,
      exampleTaskRepository.manager,
      exampleTaskRepository.queryRunner,
    );
  }

  async createExample(
    exampleTaskData: Partial<ExampleTask>,
    entityManager?: EntityManager,
  ): Promise<ExampleTask> {
    const manager = entityManager || this.entityManager;
    const exampleTask = manager.create(ExampleTask, exampleTaskData);
    return manager.save(ExampleTask, exampleTask);
  }

  async findByReference(reference: string): Promise<ExampleTask> {
    return this.findOne({ where: { reference } });
  }

  async findExampleTasks(query: FindManyOptions<ExampleTask> = {}): Promise<ExampleTask[]> {
    return this.find(query);
  }
}
