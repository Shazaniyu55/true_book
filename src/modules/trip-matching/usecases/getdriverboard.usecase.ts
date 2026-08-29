import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { TripMatchingService } from '../service/trip-matching.service';
import { BoardQueryDto } from '../dtos/trip-matching.dto';

@Injectable()
export class GetDriverBoardUsecase extends Usecase {
  constructor(private readonly matching: TripMatchingService) {
    super();
  }

  async execute(_em: EntityManager, args: { query: BoardQueryDto }) {
    return this.matching.getDriverBoard(args.query);
  }
}
