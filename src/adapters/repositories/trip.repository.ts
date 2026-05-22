import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, FindManyOptions, Repository } from 'typeorm';
import { Trip } from '@modules/core/entities/trip.entity';
import { TripStatus } from '../../types/enums';

@Injectable()
export class TripRepository extends Repository<Trip> {
  constructor(
    @InjectRepository(Trip)
    private readonly tripRepository: Repository<Trip>,
    private readonly entityManager: EntityManager,
  ) {
    super(tripRepository.target, tripRepository.manager, tripRepository.queryRunner);
  }

  async createTrip(data: Partial<Trip>, entityManager?: EntityManager): Promise<Trip> {
    const manager = entityManager || this.entityManager;
    const trip = manager.create(Trip, data);
    return manager.save(Trip, trip);
  }

  async findByReference(reference: string): Promise<Trip> {
    return this.findOne({ where: { reference }, relations: ['driver', 'vehicle'] });
  }

  async findActiveTrips(query: FindManyOptions<Trip> = {}): Promise<Trip[]> {
    return this.find({ ...query, where: { status: TripStatus.ACTIVE, ...query.where } });
  }

  async updateTrip(id: number, data: Partial<Trip>, entityManager?: EntityManager): Promise<Trip> {
    const manager = entityManager || this.entityManager;
    await manager.update(Trip, id, data);
    return manager.findOne(Trip, { where: { id } });
  }
}
