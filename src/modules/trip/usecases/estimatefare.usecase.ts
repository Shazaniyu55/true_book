import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { FareService } from '../service/fare.service';
import { FareEstimateQueryDto } from '../dtos/trip.dto';

/**
 * Passenger-facing: when a searched trip isn't available and the passenger
 * moves to request one, show an estimated cost for 1–N passengers so they know
 * what they'll spend and roughly what a driver could charge per seat.
 */
@Injectable()
export class EstimateFareUsecase extends Usecase {
  constructor(private readonly fareService: FareService) {
    super();
  }

  async execute(_em: EntityManager, args: FareEstimateQueryDto) {
    return this.fareService.estimateForPassengers(
      args.origin,
      args.destination,
      args.seats ?? 4,
    );
  }
}
