import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';

import { TripRequestRepository } from '@adapters/repositories/trip-request.repository';
import {
  ApproveTripRequestDto,
  CreateTripRequestDto,
  DeclineTripRequestDto,
  TripRequestListQueryDto,
} from '../dtos/trip-request.dto';

@Injectable()
export class TripRequestService {
  constructor(private readonly repo: TripRequestRepository) {}

  // ── Passenger ──────────────────────────────────────────────────────────
  createRequest(userId: string, dto: CreateTripRequestDto, em?: EntityManager) {
    return this.repo.createRequest(userId, dto, em);
  }

  getMyRequests(userId: string, query: TripRequestListQueryDto) {
    return this.repo.getMyRequests(userId, query);
  }

  // ── Admin ──────────────────────────────────────────────────────────────
  listRequests(query: TripRequestListQueryDto) {
    return this.repo.listRequests(query);
  }

  getRequestById(id: string) {
    return this.repo.getRequestById(id);
  }

  approveRequest(adminId: string, id: string, dto: ApproveTripRequestDto, em?: EntityManager) {
    return this.repo.approveRequest(adminId, id, dto, em);
  }

  declineRequest(adminId: string, id: string, dto: DeclineTripRequestDto, em?: EntityManager) {
    return this.repo.declineRequest(adminId, id, dto, em);
  }
}