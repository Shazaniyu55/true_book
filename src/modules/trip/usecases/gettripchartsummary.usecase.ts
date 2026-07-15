import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { TripsService } from '../service/trip.service';

@Injectable()
export class GetTripChartSummaryUsecase extends Usecase {
  constructor(private readonly tripserviceService: TripsService) { super(); }
  async execute(_em: EntityManager, args: { id: string; filterBy?: 'daily' | 'weekly' | 'monthly' | 'yearly' }) {
    return this.tripserviceService.getTripChartSummary(args.id, args.filterBy);
  }
}
