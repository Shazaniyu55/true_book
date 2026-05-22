import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ExampleTask } from './entities/example.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ExampleTask])],
  providers: [],
  exports: [
    // Repositories
    // Services
    // UseCases
  ],
})
export class CoreModule {}
