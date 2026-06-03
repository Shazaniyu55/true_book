import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Passenger } from './passenger.entity';

/**
 * Records a passenger's trip searches.
 *
 * NOTE: Columns inferred from the search params in TripRepository.searchTrips
 * (origin, destination, date, seats, maxPrice). Adjust to match your actual
 * Laravel migration if it differs.
 */
@Entity('search_histories')
export class SearchHistory extends BaseEntity {
  @Index()
  @Column({ type: 'uuid' })
  passengerId: string;

  @ManyToOne(() => Passenger)
  @JoinColumn({ name: 'passengerId' })
  passenger: Passenger;

  @Column({ type: 'varchar', nullable: true })
  origin: string;

  @Column({ type: 'varchar', nullable: true })
  destination: string;

  @Column({ type: 'date', nullable: true })
  departureDate: Date;

  @Column({ type: 'integer', nullable: true })
  seats: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  maxPrice: number;

  /** Number of trips returned for this search (optional analytics) */
  @Column({ type: 'integer', nullable: true })
  resultCount: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;
}