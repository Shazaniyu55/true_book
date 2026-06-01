import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { PassengerService } from '../services/passanger.service';

@Injectable()
export class GetPassengerDashBoardUsecase extends Usecase {
  constructor(private readonly passengerService: PassengerService) {
    super();
  }

  async execute(_entityManager: EntityManager, args: { id: string }) {
    return this.passengerService.getDashboard(args.id);
  }
}