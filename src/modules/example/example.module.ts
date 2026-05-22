import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ExampleAdapter } from '@adapters/example/example.adapter';
import { ExampleTaskRepository } from '@adapters/repositories/example.repository';
import { Broker } from '@broker/broker';
import { ExampleTask } from '@modules/core/entities/example.entity';

import { ExampleTaskController } from './controllers/example.controller';
import { ExampleTaskService } from './services/exampleTask.service';
import { CreateExampleTaskUsecase } from './usecases/createExampleTask.usecase';
import { ListExampleTasksUsecase } from './usecases/listExampleTasks.usecase';
import { ExampleProvider } from '@adapters/example/providers/example.provider';

@Module({
  imports: [TypeOrmModule.forFeature([ExampleTask])],
  controllers: [ExampleTaskController],
  providers: [
    Broker,
    ExampleAdapter,
    ExampleTaskRepository,
    ExampleTaskService,
    CreateExampleTaskUsecase,
    ListExampleTasksUsecase,
    ExampleProvider,
  ],
  exports: [ExampleTaskService, ExampleTaskRepository],
})
export class ExampleModule {}
