import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';

import { Usecase } from '@broker/types';
import { ExampleTask } from '@modules/core/entities/example.entity';

import { CreateExampleTaskDto } from '../dtos/createExampleTask.dto';
import { ExampleTaskService } from '../services/exampleTask.service';

@Injectable()
export class CreateExampleTaskUsecase extends Usecase<{ exampleTask: ExampleTask }> {
  constructor(private readonly exampleTaskService: ExampleTaskService) {
    super();
  }

  async execute(
    entityManager: EntityManager,
    args: CreateExampleTaskDto,
  ): Promise<{ exampleTask: ExampleTask }> {
    const exampleTask = await this.exampleTaskService.createTask(args, entityManager);
    return { exampleTask };
  }
}
