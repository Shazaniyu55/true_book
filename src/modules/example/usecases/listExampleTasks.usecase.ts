import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';

import { Usecase } from '@broker/types';
import { ExampleTask } from '@modules/core/entities/example.entity';
import { QueryDto } from '@shared/dtos/query.dto';

import { ExampleTaskService } from '../services/exampleTask.service';

type ListExampleTasksArgs = {
  query?: QueryDto;
};

@Injectable()
export class ListExampleTasksUsecase extends Usecase<{ exampleTasks: ExampleTask[] }> {
  constructor(private readonly exampleTaskService: ExampleTaskService) {
    super();
  }

  async execute(
    _entityManager: EntityManager,
    args: ListExampleTasksArgs,
  ): Promise<{ exampleTasks: ExampleTask[] }> {
    const exampleTasks = await this.exampleTaskService.listTasks(args.query || {});
    return { exampleTasks };
  }
}
