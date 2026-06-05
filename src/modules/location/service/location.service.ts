import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WsException } from '@nestjs/websockets';
import { Trip } from '@modules/core/entities/trip.entity';
import { Driver } from '@modules/core/entities/driver.entity';
import { TripStatus } from 'src/types/enums';
import { RedisCacheService } from '@modules/cache/redis-cache.service';
import { TripLocation } from '@modules/core/entities/triplocation.entity';
import { LocationPingDto } from '../dtos/location.dto';

const LIVE_TTL_SECONDS = 60 * 60; // keep last-known position 1h

@Injectable()
export class LocationService {
  private readonly logger = new Logger(LocationService.name);

  constructor(
    @InjectRepository(TripLocation) private readonly locationRepo: Repository<TripLocation>,
    @InjectRepository(Trip) private readonly tripRepo: Repository<Trip>,
    @InjectRepository(Driver) private readonly driverRepo: Repository<Driver>,
    private readonly cache: RedisCacheService,
  ) {}

  /** Driver pushes a GPS ping. Validates ownership, persists, caches, returns broadcast payload. */
  async recordPing(userId: string, dto: LocationPingDto) {
    const driver = await this.driverRepo.findOne({ where: { userId } });
    if (!driver) throw new WsException('Driver profile not found');

    const trip = await this.tripRepo.findOne({ where: { id: dto.tripId } });
    if (!trip) throw new WsException('Trip not found');
    if (trip.driverId !== driver.id) throw new WsException('This trip does not belong to you');
    if (trip.status !== TripStatus.ACTIVE) throw new WsException('Trip is not active');

    const ping = this.locationRepo.create({
      tripId: trip.id,
      driverId: driver.id,
      latitude: dto.lat,
      longitude: dto.lng,
      heading: dto.heading ?? null,
      speed: dto.speed ?? null,
    });
    await this.locationRepo.save(ping);

    const payload = {
      tripId: trip.id,
      lat: dto.lat,
      lng: dto.lng,
      heading: dto.heading ?? null,
      speed: dto.speed ?? null,
      at: ping.createdAt,
    };

    // Live read cache — dashboard / late-joining admins read this for initial marker
    await this.cache.set(`trip:${trip.id}:location`, payload, LIVE_TTL_SECONDS);
    return payload;
  }

  /** Last-known position for a trip (REST initial load / polling fallback). */
  async getCurrentLocation(tripId: string) {
    const cached = await this.cache.get(`trip:${tripId}:location`);
    if (cached) return cached;

    const last = await this.locationRepo.findOne({
      where: { tripId },
      order: { createdAt: 'DESC' },
    });
    if (!last) return null;
    return {
      tripId,
      lat: Number(last.latitude),
      lng: Number(last.longitude),
      heading: last.heading,
      speed: last.speed,
      at: last.createdAt,
    };
  }

  /** Full ping history for route replay / disputes. */
  async getTripTrack(tripId: string) {
    const rows = await this.locationRepo.find({
      where: { tripId },
      order: { createdAt: 'ASC' },
    });
    return rows.map((r) => ({
      lat: Number(r.latitude),
      lng: Number(r.longitude),
      heading: r.heading,
      at: r.createdAt,
    }));
  }
}