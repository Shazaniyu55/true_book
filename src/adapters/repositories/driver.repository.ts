import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Driver } from '@modules/core/entities/driver.entity';
import { UpdateDriverProfileDto } from '@modules/driver/dtos/updatedriver.dto';
import { User } from '@modules/core/entities/user.entity';
import { VehicleType } from '@modules/core/entities/vehicletype.entity';
import { EscrowStatus, TripStatus } from 'src/types/enums';
import { Trip } from '@modules/core/entities/trip.entity';
import { Escrow } from '@modules/core/entities/escro.entity';
import { Payout } from '@modules/core/entities/payout.entity';

@Injectable()
export class DriverRepository extends Repository<Driver> {
  constructor(
    @InjectRepository(Driver)
    private readonly driverRepository: Repository<Driver>,
    private readonly entityManager: EntityManager,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(VehicleType) private readonly vehicleTypeRepo: Repository<VehicleType>,
    @InjectRepository(Trip) private readonly tripRepository: Repository<Trip>,
    @InjectRepository(Escrow) private readonly escrowRepo: Repository<Escrow>,
    @InjectRepository(Payout) private readonly payoutRepo: Repository<Payout>
    
  ) {
    super(driverRepository.target, driverRepository.manager, driverRepository.queryRunner);
  }

  async createDriver(data: Partial<Driver>, entityManager?: EntityManager): Promise<Driver> {
    const manager = entityManager || this.entityManager;
    const driver = manager.create(Driver, data);
    return manager.save(Driver, driver);
  }

  async findByUserId(id: string): Promise<Driver> {
    return this.findOne({ where: { id }, relations: ['users'] });
  }



 async updateDriver(
  id: string,
  dto: UpdateDriverProfileDto,
  entityManager?: EntityManager,
): Promise<Driver> {
  const manager = entityManager || this.entityManager;

  const driver = await this.driverRepository.findOne({
    where: { userId: id },
    relations: ['user'],
  });

  if (!driver) {
    throw new NotFoundException('Driver profile not found');
  }

  // ---------------------------
  // Update User fields
  // ---------------------------
  const userUpdates: Partial<User> = {};

  if (dto.firstName) userUpdates.firstName = dto.firstName;
  if (dto.lastName) userUpdates.lastName = dto.lastName;
  if (dto.phone) userUpdates.phone = dto.phone;
  // if (dto.fullName) userUpdates.lastName = dto.fullName; // looks like a bug too, see below
  if (dto.profileImage) userUpdates.profileImage = dto.profileImage;

  if (Object.keys(userUpdates).length > 0) {
    await manager.update(User, driver.user.id, userUpdates);
  }

  // ---------------------------
  // Update Driver fields
  // ---------------------------
  const driverUpdates: Partial<Driver> = {};

  if (dto.state) {
    driverUpdates.user.metadata = {
      ...(driver.user.metadata ?? {}),
      state: dto.state,
    };
  }

  if (Object.keys(driverUpdates).length > 0) {
    await manager.update(Driver, id, driverUpdates);
  }

  // ---------------------------
  // Return updated data
  // ---------------------------
  return await this.driverRepository.findOne({
    where: { id },
    relations: ['user'],
  });
}

    async getProfile(userId: string) {
      const passenger = await this.driverRepository.findOne({
        where: { userId },
        relations: ['user'],
      });
      if (!passenger) throw new NotFoundException('driver profile not found');
      return passenger;
    }

async getVehicleType(): Promise<VehicleType[]> {
  return this.vehicleTypeRepo.find({
    order: { name: 'ASC' },
  });
}

async getDriverDashboard(userId: string, query: { page?: number; limit?: number } = {}) {
  const driver = await this.driverRepository.findOne({
    where: { userId },
    relations: ['user'],
  });
  if (!driver) throw new NotFoundException('Driver profile not found');

  const { page = 1, limit = 10 } = query;
  const skip = (page - 1) * limit;

  // ── activity: trip counts by status ──
  const [cancelled, completed] = await Promise.all([
    this.tripRepository.count({ where: { driverId: driver.id, status: TripStatus.CANCELLED } }),
    this.tripRepository.count({ where: { driverId: driver.id, status: TripStatus.COMPLETED } }),
  ]);

  // ── earnings: last 7 days of released escrow to this driver ──
  const since = new Date();
  since.setDate(since.getDate() - 6);
  since.setHours(0, 0, 0, 0);

  const earningRows = await this.escrowRepo
    .createQueryBuilder('e')
    .select("TO_CHAR(e.releasedAt, 'YYYY-MM-DD')", 'day')
    .addSelect('SUM(e.netDriverAmount)', 'amount')
    .where('e.driverId = :driverId', { driverId: driver.id })
    .andWhere('e.status = :status', { status: EscrowStatus.RELEASED })
    .andWhere('e.releasedAt >= :since', { since })
    .groupBy('day')
    .orderBy('day', 'ASC')
    .getRawMany();

  const earningMap = new Map(earningRows.map((r) => [r.day, Number(r.amount ?? 0)]));
  const earnings = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    return { amount: earningMap.get(key) ?? 0, day: key };
  });

  // ── payment: total ever paid out (approved) to this driver ──
  const payoutRow = await this.payoutRepo
    .createQueryBuilder('p')
    .select('COALESCE(SUM(p.amount), 0)', 'total')
    .where('p.driverId = :driverId', { driverId: driver.id })
    .andWhere('p.status = :status', { status: 'approved' })
    .getRawOne();

  // ── referral ──
  const referralCount = await this.userRepo.count({ where: { referredBy: driver.userId } });

  // ── upcoming trips: paginated ──
  const [upcoming, upcomingTotal] = await this.tripRepository.findAndCount({
    where: [
      { driverId: driver.id, status: TripStatus.PENDING },
      { driverId: driver.id, status: TripStatus.ACTIVE },
    ],
    order: { departureDate: 'ASC' },
    skip,
    take: limit,
  });

  return {
    id: driver.id,
    title: `${driver.user?.firstName ?? ''} ${driver.user?.lastName ?? ''}`.trim() || 'Driver',
    attribute: {
      activity: {
        total_trips_cancelled: String(cancelled),
        total_trips_completed: String(completed),
      },
      earnings,
      payment: { total_amount: String(payoutRow?.total ?? '0') },
      referral: { referral: String(referralCount) },
      upcoming_trips: {
        data: upcoming.map((t) => ({
          id: t.id,
          status: t.status,
          departure_date: t.departureDate,
          departure_time: t.departureTime,
          departure_location: t.departureLocation,
          arrival_date: t.arrivalDate ?? '',
          arrival_time: t.arrivalTime ?? '',
          arrival_destination: this.normalizeDestination(t.arrivalDestination),
        })),
        meta: {
          page,
          limit,
          count: upcoming.length,
          previousPage: page > 1 ? page - 1 : false,
          nextPage: skip + limit < upcomingTotal ? page + 1 : false,
          pageCount: Math.ceil(upcomingTotal / limit),
          totalRecords: upcomingTotal,
        },
      },
    },
  };
}


async getDriverTripStatus(userId: string, type?: string) {
  const driver = await this.driverRepository.findOne({ where: { userId } });
  if (!driver) throw new NotFoundException('Driver profile not found');

  const where: any = { driverId: driver.id };

  if (type) {
    // validate against the enum so a bad value fails loudly
    const valid = Object.values(TripStatus) as string[];
    if (!valid.includes(type)) {
      throw new BadRequestException(
        `Invalid trip_type "${type}". Allowed: ${valid.join(', ')}`,
      );
    }
    where.status = type;
  }

  const trips = await this.tripRepository.find({
    where,
    order: { createdAt: 'DESC' },
  });

  return trips.map((t) => ({
    id: t.id,
    reference: t.reference,
    departure_location: t.departureLocation,
    arrival_destination: this.normalizeDestination(t.arrivalDestination),
    departure_date: t.departureDate,
    departure_time: t.departureTime,
    status: t.status,
  }));
}

private normalizeDestination(dest: any): {
  address: string; latitude: string; longitude: string; name: string;
} {
  // arrivalDestination is jsonb (any[] in your entity) — coerce to the flat shape.
  const d = Array.isArray(dest) ? (dest[0] ?? {}) : (dest ?? {});
  return {
    address: d.address ?? '',
    latitude: String(d.latitude ?? ''),
    longitude: String(d.longitude ?? ''),
    name: d.name ?? '',
  };
}


}
