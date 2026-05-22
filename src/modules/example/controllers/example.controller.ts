import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { Broker } from '@broker/broker';
import { QueryDto } from '@shared/dtos/query.dto';

import { CreateExampleTaskDto } from '../dtos/createExampleTask.dto';
import { CreateExampleTaskUsecase } from '../usecases/createExampleTask.usecase';
import { ListExampleTasksUsecase } from '../usecases/listExampleTasks.usecase';

@ApiTags('Example')
@Controller('examples')
export class ExampleTaskController {
  constructor(
    private readonly broker: Broker,
    private readonly createExampleTaskUsecase: CreateExampleTaskUsecase,
    private readonly listExampleTasksUsecase: ListExampleTasksUsecase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create an example task through the full boilerplate stack' })
  create(@Body() dto: CreateExampleTaskDto) {
    return this.broker.runUsecases([this.createExampleTaskUsecase], dto);
  }

  @Get()
  @ApiOperation({ summary: 'List example tasks with shared pagination query options' })
  findAll(@Query() query: QueryDto) {
    return this.broker.runUsecases([this.listExampleTasksUsecase], { query });
  }
}
