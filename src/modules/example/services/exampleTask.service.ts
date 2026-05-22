import { Injectable } from '@nestjs/common';
import { EntityManager, ILike, FindOptionsWhere } from 'typeorm';

import { ExampleAdapter } from '@adapters/example/example.adapter';
import { ExampleTaskRepository } from '@adapters/repositories/example.repository';
import { ExampleTask, ExampleTaskStatus } from '@modules/core/entities/example.entity';
import { QueryDto } from '@shared/dtos/query.dto';

import { CreateExampleTaskDto } from '../dtos/createExampleTask.dto';

@Injectable()
export class ExampleTaskService {
  constructor(
    private readonly exampleTaskRepository: ExampleTaskRepository,
    private readonly exampleReferenceAdapter: ExampleAdapter,
  ) {}

  async createTask(dto: CreateExampleTaskDto, entityManager?: EntityManager): Promise<ExampleTask> {
    return this.exampleTaskRepository.createExample(
      {
        ...dto,
        status: dto.status || ExampleTaskStatus.DRAFT,
      },
      entityManager,
    );
  }

  async listTasks(query: QueryDto): Promise<ExampleTask[]> {
    const page = query?.page && query.page > 0 ? query.page : 1;
    const limit = query?.limit && query.limit > 0 ? query.limit : 20;
    const order = query?.order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const search = query?.search?.trim();

    const where: FindOptionsWhere<ExampleTask>[] = search
      ? [{ title: ILike(`%${search}%`) }, { reference: ILike(`%${search}%`) }]
      : undefined;

    return this.exampleTaskRepository.findExampleTasks({
      where,
      order: { createdAt: order },
      skip: (page - 1) * limit,
      take: limit,
    });
  }
}
