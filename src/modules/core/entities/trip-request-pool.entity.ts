import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { Driver } from './driver.entity';
import { Trip } from './trip.entity';
import { TripRequest } from './trip-request.entity';
import { TripPoolStatus } from 'src/types/enums';

/**
 * A pool groups multiple passenger trip requests that share the same route and
 * date into ONE combined request. The matching engine sums the seats, works out
 * whether the route is intra- or inter-state, and schedules when the pool should
 * be pushed to the driver trip-request board:
 *   • intra-state  → 12 hours before departure
 *   • inter-state  → 18 hours before departure
 *
 * Drivers see BOARD pools on their request board and can claim one, which links
 * (or later creates) a real trip that serves every passenger in the pool.
 */
@Entity('trip_request_pools')
@Index(['matchKey', 'status'])
export class TripRequestPool extends BaseEntity {
  /** Deterministic grouping key: `origin|destination|YYYY-MM-DD` (normalised). */
  @Index()
  @Column({ type: 'varchar' })
  matchKey: string;

  // ── Route ──────────────────────────────────────────────────────────────
  @Column({ type: 'varchar' })
  origin: string;

  @Column({ type: 'varchar' })
  destination: string;

  @Column({ type: 'varchar', nullable: true })
  originState: string | null;

  @Column({ type: 'varchar', nullable: true })
  destinationState: string | null;

  @Column({ type: 'boolean', default: true })
  isInterState: boolean;

  // ── When ───────────────────────────────────────────────────────────────
  @Column({ type: 'date' })
  requestedDate: string;

  /** Earliest preferred departure time across members (HH:mm:ss). */
  @Column({ type: 'time', nullable: true })
  departureTime: string | null;

  /** Full departure instant (requestedDate + departureTime), used for window math. */
  @Column({ type: 'timestamp with time zone' })
  departureAt: Date;

  // ── Demand ─────────────────────────────────────────────────────────────
  @Column({ type: 'integer', default: 0 })
  totalSeats: number;

  @Column({ type: 'integer', default: 0 })
  memberCount: number;

  // ── Board dispatch scheduling ──────────────────────────────────────────
  @Index()
  @Column({
    type: 'varchar',
    enum: TripPoolStatus,
    default: TripPoolStatus.MATCHING,
  })
  status: TripPoolStatus;

  /** 12 (intra-state) or 18 (inter-state). */
  @Column({ type: 'integer', default: 18 })
  dispatchWindowHours: number;

  /** When this pool becomes visible on the driver board (departureAt − window). */
  @Index()
  @Column({ type: 'timestamp with time zone' })
  dispatchAt: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  dispatchedAt: Date | null;

  // ── Fulfilment ─────────────────────────────────────────────────────────
  @Column({ type: 'uuid', nullable: true })
  claimedByDriverId: string | null;

  @ManyToOne(() => Driver, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'claimedByDriverId' })
  claimedByDriver: Driver;

  @Column({ type: 'timestamp with time zone', nullable: true })
  claimedAt: Date | null;

  @Column({ type: 'uuid', nullable: true })
  linkedTripId: string | null;

  @ManyToOne(() => Trip, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'linkedTripId' })
  linkedTrip: Trip;

  @OneToMany(() => TripRequest, (req) => req.pool)
  requests: TripRequest[];

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;
}
