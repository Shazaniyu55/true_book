import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { TripsService } from '../service/trip.service';
import { ScanTicketDto } from '../dtos/trip.dto';

@Injectable()
export class ScanTicketUsecase extends Usecase {
  constructor(private readonly tripserviceService: TripsService) { super(); }
  async execute(em: EntityManager, args: { id: string; dto: ScanTicketDto }) {
    return this.tripserviceService.scanTicket(args.id, args.dto, em);
  }
}