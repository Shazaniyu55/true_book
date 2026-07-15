import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, ILike, Repository } from 'typeorm';
import { Admin } from '@modules/core/entities/admin.entity';
import { User } from '@modules/core/entities/user.entity';
import { Driver } from '@modules/core/entities/driver.entity';
import { Trip } from '@modules/core/entities/trip.entity';
import { Booking } from '@modules/core/entities/booking.entity';
import { Payout } from '@modules/core/entities/payout.entity';
import { DocumentVerification } from '@modules/core/entities/document-verification.entity';
import { Coupon } from '@modules/core/entities/coupon.entity';
import { Passenger } from '@modules/core/entities/passenger.entity';
import { PaystackAdapter } from '@adapters/payment/paystack/paystack.adapter';
import {
  CouponStatus,
  CouponType,
  DocumentStatus,
  KycStatus,
  PayoutStatus,
  TripStatus,
  UserStatus,
} from 'src/types/enums';
import { Role } from '@modules/core/entities/role.entity';
import { PagedDto } from '@shared/interface/paged.interface';
import { Agent } from '@modules/core/entities/agent.entity';
import { AddDriverDocumentsDto } from '@modules/admin/dtos/adddoc.dto';
import { Beneficiary } from '@modules/core/entities/beneficiary.entity';
import { Vehicle } from '@modules/core/entities/vehicle.entity';
import { startOfDay, endOfDay, subDays, format } from 'date-fns';
import { Between } from 'typeorm';
import { Review } from '@modules/core/entities/review.entity';

@Injectable()
export class AdminRepository extends Repository<Admin> {
  constructor(
    @InjectRepository(Admin) private readonly adminRepository: Repository<Admin>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Driver) private readonly driverRepo: Repository<Driver>,
    @InjectRepository(Trip) private readonly tripRepo: Repository<Trip>,
    @InjectRepository(Booking) private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(Payout) private readonly payoutRepo: Repository<Payout>,
    @InjectRepository(DocumentVerification) private readonly docRepo: Repository<DocumentVerification>,
    @InjectRepository(Coupon) private readonly couponRepo: Repository<Coupon>,
    @InjectRepository(Passenger) private readonly passengerRepo: Repository<Passenger>,
    @InjectRepository(Role) private readonly roleRepository: Repository<Role>,
    @InjectRepository(Agent) private readonly agentRepo: Repository<Agent>,
    @InjectRepository(Beneficiary) private readonly beneficiaryRepo: Repository<Beneficiary>,
    @InjectRepository(Vehicle) private readonly vehicleRepo: Repository<Vehicle>,
    @InjectRepository(Review) private readonly reviewRepo: Repository<Review>,
    private readonly entityManager: EntityManager,
    private readonly paystackAdapter: PaystackAdapter,


  ) {
    super(adminRepository.target, adminRepository.manager, adminRepository.queryRunner);
  }

  async createAdmin(data: Partial<Admin>, entityManager?: EntityManager): Promise<Admin> {
    const manager = entityManager || this.entityManager;
    const user = manager.create(Admin, data);
    return manager.save(Admin, user);
  }

  async getProfile(id: string) {
      const admin = await this.adminRepository.findOne({
        where: { id },
      });
      if (!admin) throw new NotFoundException('Admin profile not found');
      return admin;
    }

  async findByEmail(email: string): Promise<Admin> {
    return this.findOne({ where: { email: email.toLowerCase() } });
  }

  async updateUser(id: string, data: Partial<Admin>, entityManager?: EntityManager): Promise<Admin> {
    const manager = entityManager || this.entityManager;
    await manager.update(Admin, id, data);
    return manager.findOne(Admin, { where: { id } });
  }

  async getOverviews() {
  const todayStart = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());

  const [activeTrips, upcomingTrips, completedTrips, cancelledTrips] = await Promise.all([
    this.tripRepo.count({
      where: {
        status: TripStatus.ACTIVE as any,
        departureDate: Between(todayStart as any, todayEnd as any),
      },
    }),
    this.tripRepo.count({
      where: {
        status: TripStatus.PENDING as any,
        departureDate: Between(todayStart as any, todayEnd as any),
      },
    }),
    this.tripRepo.count({
      where: {
        status: TripStatus.COMPLETED as any,
        departureDate: Between(todayStart as any, todayEnd as any),
      },
    }),
    this.tripRepo.count({
      where: {
        status: TripStatus.CANCELLED as any,
        departureDate: Between(todayStart as any, todayEnd as any),
      },
    }),
  ]);

  return {
    active_trips: activeTrips,
    upcoming_trips: upcomingTrips,
    completed_trips: completedTrips,
    cancelled_trips: cancelledTrips,
  };
}

  async getPassengers(query: {
  page?: number;
  limit?: number;
  search?: string;
  kycStatus?: string;
  status?: string;
}): Promise<PagedDto<any>>{
    const { page = 1, limit = 20, search, kycStatus, status } = query;
  const skip = (page - 1) * limit;
    const qb = this.passengerRepo
    .createQueryBuilder('passenger')
    .leftJoinAndSelect('passenger.user', 'user')
    .where('passenger.deletedAt IS NULL')
    .orderBy('passenger.createdAt', 'DESC')
    .skip(skip)
    .take(limit);

     const [data, total] = await qb.getManyAndCount();
     const pagedDto = new PagedDto();
      pagedDto.data = data;
      pagedDto.meta = {
        page,
        limit,
        count: data.length,
        previousPage: page > 1 ? page - 1 : false,
        nextPage: skip + limit < total ? page + 1 : false,
        pageCount: Math.ceil(total / limit),
        totalRecords: total,
      };
      return pagedDto;

  }

  async getRevenue() {
  const today = endOfDay(new Date());
  const startOfWeek = startOfDay(subDays(new Date(), 6));

  const revenueResult = await this.bookingRepo
    .createQueryBuilder('b')
    .select('SUM(b.amountPaid)', 'total')
    .where('b.paymentStatus = :s', { s: 'success' })
    .andWhere('b.createdAt BETWEEN :start AND :end', {
      start: startOfWeek,
      end: today,
    })
    .getRawOne();

  const dailyGraph = await this.bookingRepo
    .createQueryBuilder('b')
    .select("TO_CHAR(b.createdAt, 'YYYY-MM-DD')", 'day')
    .addSelect('SUM(b.amountPaid)', 'total')
    .where('b.paymentStatus = :s', { s: 'success' })
    .andWhere('b.createdAt BETWEEN :start AND :end', {
      start: startOfWeek,
      end: today,
    })
    .groupBy('day')
    .orderBy('day', 'ASC')
    .getRawMany();

  const graphMap = new Map(dailyGraph.map((g) => [g.day, parseFloat(g.total ?? '0')]));
  const graphData = Array.from({ length: 7 }, (_, i) => {
    const date = format(subDays(new Date(), 6 - i), 'yyyy-MM-dd');
    const dayName = format(subDays(new Date(), 6 - i), 'EEEE'); // e.g. "Monday"
    return {
      day: dayName,
      date,
      revenue: graphMap.get(date) ?? 0,
    };
  });

  return {
    total_revenue: parseFloat(revenueResult?.total ?? '0'),
    graph_data: graphData,
  };
}

async getDrivers(query: {
  page?: number;
  limit?: number;
  search?: string;
  kycStatus?: string;
  status?: string;
}): Promise<PagedDto<any>> {
  const { page = 1, limit = 20, search, kycStatus, status } = query;
  const skip = (page - 1) * limit;

  const qb = this.driverRepo
    .createQueryBuilder('driver')
    .leftJoinAndSelect('driver.user', 'user')
    .where('driver.deletedAt IS NULL')
    .orderBy('driver.createdAt', 'DESC')
    .skip(skip)
    .take(limit);

  if (kycStatus) {
    qb.andWhere('driver.kycStatus = :kycStatus', { kycStatus });
  }

  if (status) {
    qb.andWhere('driver.status = :status', { status });
  }

  if (search) {
    qb.andWhere(
      '(user.email ILIKE :search OR user.firstName ILIKE :search OR user.lastName ILIKE :search)',
      { search: `%${search}%` },
    );
  }

  const [data, total] = await qb.getManyAndCount();

  const pagedDto = new PagedDto();
  pagedDto.data = data;
  pagedDto.meta = {
    page,
    limit,
    count: data.length,
    previousPage: page > 1 ? page - 1 : false,
    nextPage: skip + limit < total ? page + 1 : false,
    pageCount: Math.ceil(total / limit),
    totalRecords: total,
  };
  return pagedDto;
}
async getDriverById(id: string) {
  try {
    const driver = await this.driverRepo.findOne({
      where: { id },
      relations: ['user', 'vehicle'],
    });
    if (!driver) throw new NotFoundException('Driver not found');

     const [tripHistory] = await this.tripRepo.findAndCount({
      where: { driverId: id },
      order: { createdAt: 'DESC' },
      take: 10,
    });
    //return driver;
     return {
      ...driver,
      tripHistory: tripHistory,
    };
  } catch (e) {
    console.error('getDriverById error:', e?.message, e?.stack);
    throw e;
  }
}

async getAgents(query: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<PagedDto<any>> {
  const { page = 1, limit = 10, search } = query;
  const skip = (page - 1) * limit;

  const qb = this.agentRepo
    .createQueryBuilder('agent')
    .where('agent.deletedAt IS NULL')
    .orderBy('agent.createdAt', 'DESC')
    .skip(skip)
    .take(limit);

  if (search) {
    qb.andWhere(
      '(agent.user.firstName ILIKE :search OR agent.user.lastName ILIKE :search OR agent.user.email ILIKE :search)',
      { search: `%${search}%` },
    );
  }

  const [data, total] = await qb.getManyAndCount();

  const pagedDto = new PagedDto();
  pagedDto.data = data;
  pagedDto.meta = {
    page,
    limit,
    count: data.length,
    previousPage: page > 1 ? page - 1 : false,
    nextPage: skip + limit < total ? page + 1 : false,
    pageCount: Math.ceil(total / limit),
    totalRecords: total,
  };
  return pagedDto;
}

async getDriverVehicle(driverId: string) {
  try {
    const vehicle = await this.vehicleRepo.findOne({
      where: { driverId },
    });
    return vehicle;
  } catch (e) {
    // log it properly instead of swallowing
    throw e;
  }
}

async getPassengerById(id: string){
  const passenger = await this.passengerRepo.findOne({
    where: { id },
    relations: ['user'],
  });
  if (!passenger) throw new NotFoundException('passenger not found');
  return passenger;
}

async getAgentById(id: string) {
  const agent = await this.agentRepo.findOne({ where: { id } });
  if (!agent) throw new NotFoundException('Agent not found');
  return agent;
}

async getAgentWithDetails(id: string) {
  const agent = await this.agentRepo.findOne({
    where: { id },
    relations: ['referrals', 'payouts'],
  });
  if (!agent) throw new NotFoundException('Agent not found');

   const payouts = await this.payoutRepo.find({
    where: { agentId: id },
    order: { createdAt: 'DESC' },
  });

   const referrals = await this.userRepo.find({
    where: { referredBy: id },
  });

 const totalPaid = payouts
    .filter((p) => p.status === PayoutStatus.APPROVED)
    .reduce((sum, p) => sum + (Number(p.amount) ?? 0), 0);

  const totalEarned = Number(agent.totalCommission ?? 0); 

  return {
    profile: agent,
    total_referrals: agent.totalReferrals, 
    earning_overview: {
      total_earnings: totalEarned,
      payment_processed: totalPaid,
      pending_payment: totalEarned - totalPaid,
    },
    withdrawal_requests: payouts.map((p) => ({
      amount: p.amount,
      status: p.status,
      date: p.createdAt,
    })),
  };
}

async getAgentReferrals(agentId: string, query: { page?: number; limit?: number }) {
  const { page = 1, limit = 15 } = query;
  const skip = (page - 1) * limit;

  const agent = await this.agentRepo.findOne({ where: { id: agentId } });
  if (!agent) throw new NotFoundException('Agent not found');

  const [referrals, total] = await this.userRepo.findAndCount({
    where: { referredBy: agentId },
    skip,
    take: limit,
    order: { createdAt: 'DESC' },
  });

  const data = referrals.map((ref) => ({
    id: ref.id,
    name: `${ref.firstName} ${ref.lastName}`,
    email: ref.email,
    phone_number: ref.phone,
    status: ref.status,
    date_referred: ref.createdAt,
    profile_image: ref.profileImage,
  }));

  const pagedDto = new PagedDto();
  pagedDto.data = data;
  pagedDto.meta = {
    page,
    limit,
    count: data.length,
    previousPage: page > 1 ? page - 1 : false,
    nextPage: skip + limit < total ? page + 1 : false,
    pageCount: Math.ceil(total / limit),
    totalRecords: total,
  };
  return pagedDto;
}

async toggleAgentStatus(id: string) {
  const agent = await this.agentRepo.findOne({ where: { id } });
  if (!agent) throw new NotFoundException('Agent not found');
  agent.status = agent.status === UserStatus.ACTIVE ? UserStatus.SUSPENDED : UserStatus.ACTIVE;
  return this.agentRepo.save(agent);
}

async togglePassengerStatus(id: string) {
  const passenger = await this.passengerRepo.findOne({
    where: { id },
    relations: ['user'],
  });
  if (!passenger) throw new NotFoundException('Passenger not found');
  passenger.user.status =
    passenger.user.status === UserStatus.ACTIVE ? UserStatus.SUSPENDED : UserStatus.ACTIVE;
  return this.userRepo.save(passenger.user);
}

async toggleDriverStatus(id: string) {
  const driver = await this.driverRepo.findOne({
    where: { id },
    relations: ['user'],
  });
  if (!driver) throw new NotFoundException('Driver not found');
  driver.user.status =
    driver.user.status === UserStatus.ACTIVE ? UserStatus.SUSPENDED : UserStatus.ACTIVE;
  return this.userRepo.save(driver.user);
}

async getPassengerWithDetails(id: string, query: { page?: number; limit?: number } = {}) {
  const { page = 1, limit = 10 } = query;
  const skip = (page - 1) * limit;

  const passenger = await this.passengerRepo.findOne({
    where: { id },
    relations: ['user'],
  });
  if (!passenger) throw new NotFoundException('Passenger not found');

  const [tripHistory, tripTotal] = await this.bookingRepo.findAndCount({
    where: { passengerId: passenger.id },
    relations: ['trip'],
    skip,
    take: limit,
    order: { createdAt: 'DESC' },
  });

  const [referrals, referralTotal] = await this.userRepo.findAndCount({
    where: { referredBy: passenger.user.id },
    skip,
    take: limit,
    order: { createdAt: 'DESC' },
  });

  return {
    profile: passenger,
    next_of_kin: {
      name: passenger.nxt_kin_name,
      relationship: passenger.nxt_kin_relationship,
      phone_number: passenger.nxt_kin_telephone,
    },
    referrals: {
      data: referrals.map((r) => ({
        name: `${r.firstName} ${r.lastName}`,
        email: r.email,
        phone_number: r.phone,
        status: r.status,
        date_referred: r.createdAt,
        profile_image: r.profileImage,
      })),
      meta: { page, limit, totalRecords: referralTotal },
    },
    trip_history: {
      data: tripHistory.map((b) => ({
        trip_id: b.id,
        departure_location: b.trip?.departureLocation,
        arrival_location: b.trip?.arrivalDestination,
        departure_date: b.trip?.departureDate,
        departure_time: b.trip?.departureTime,
        arrival_date: b.trip?.arrivalDate,
        arrival_time: b.trip?.arrivalTime,
        amount: (b.amountPaid ?? 0) / 100,
        status: b.status,
      })),
      meta: { page, limit, totalRecords: tripTotal },
    },
  };
}

async getDriverWithDetails(id: string, query: { page?: number; limit?: number } = {}) {
  const { page = 1, limit = 10 } = query;
  const skip = (page - 1) * limit;

  const driver = await this.driverRepo.findOne({
    where: { id },
    relations: ['user', 'vehicle', 'beneficiaries'],
  });
  if (!driver) throw new NotFoundException('Driver not found');

  const reviews = await this.reviewRepo.find({
    where: { driverId: id, isVisible: true },
    relations: ['passenger.user'],
    order: { createdAt: 'DESC' },
  });

  const [tripHistory, tripTotal] = await this.tripRepo.findAndCount({
    where: { driverId: driver.id },
    skip,
    take: limit,
    order: { createdAt: 'DESC' },
  });

  return {
    profile: driver,
    vehicle: driver.vehicle,  
    rating_summary: {
      average: Number(driver.averageRating),
      count: driver.ratingCount,
    },
    reviews: reviews.map((r) => ({
      passenger: `${r.passenger?.user?.firstName ?? ''} ${r.passenger?.user?.lastName ?? ''}`.trim(),
      profile_image: r.passenger?.user?.profileImage,
      date: r.createdAt,
      rating: r.rating,
      comment: r.comment,
    })),
    trip_history: {
      data: tripHistory.map((t) => ({
        trip_id: t.id,
        departure_location: t.departureLocation,
        arrival_location: t.arrivalDestination,
        departure_date: t.departureDate,
        departure_time: t.departureTime,
        arrival_date: t.arrivalDate,
        arrival_time: t.arrivalTime,
        status: t.status,
      })),
      meta: { page, limit, totalRecords: tripTotal },
    },
  };
}

async getTripWithPassengers(tripId: string, query: { page?: number; limit?: number } = {}) {
  const { page = 1, limit = 10 } = query;
  const skip = (page - 1) * limit;

  const trip = await this.tripRepo.findOne({
    where: { id: tripId },
    relations: ['driver.user', 'vehicle.driver'],
  });
  if (!trip) throw new NotFoundException('Trip not found');

  const [bookings, total] = await this.bookingRepo.findAndCount({
    where: { tripId },
    relations: ['passenger.user'],
    skip,
    take: limit,
    order: { createdAt: 'DESC' },
  });

  const pagedDto = new PagedDto();
  pagedDto.data = bookings.map((b) => ({
    id: b.id,
    tracking_id: b.couponCode,
    ticket_number: b.ticketToken,
    profile_image: b.passenger?.user?.profileImage,
    name: `${b.passenger?.user?.firstName} ${b.passenger?.user?.lastName}`,
    email: b.passenger?.user?.email,
    phone_number: b.passenger?.user?.phone,
    status: b.status,
    amount: (b.amountPaid ?? 0) / 100,
    created_at: b.createdAt,
  }));
  pagedDto.meta = {
    page,
    limit,
    count: bookings.length,
    previousPage: page > 1 ? page - 1 : false,
    nextPage: skip + limit < total ? page + 1 : false,
    pageCount: Math.ceil(total / limit),
    totalRecords: total,
  };

  return {
    trip_details: trip,
    passengers: pagedDto,
  };
}

  // ─── Dashboard ───────────────────────────────────────────────────────────────

  async getDashboardStats(query: { page?: number; limit?: number } = {}) {
  const { page = 1, limit = 20 } = query;
  const skip = (page - 1) * limit;

  // Run all counts + overviews + revenue in parallel
  const [
    totalUsers,
    totalDrivers,
    totalPassengers,
    totalTrips,
    totalBookings,
    pendingPayouts,
    pendingDocuments,
    totalAgents,
    overviews,
    revenue,
  ] = await Promise.all([
    this.userRepo.count({ where: { deletedAt: null } }),
    this.driverRepo.count({ where: { deletedAt: null } }),
    this.passengerRepo.count({ where: { deletedAt: null } }),
    this.tripRepo.count({ where: { deletedAt: null } }),
    this.bookingRepo.count({ where: { deletedAt: null } }),
    this.payoutRepo.count({ where: { status: PayoutStatus.PENDING } }),
    this.docRepo.count({ where: { status: DocumentStatus.PENDING } }),
    this.agentRepo.count({ where: { deletedAt: null } }),
    this.getOverviews(),   // today's trip counts by status
    this.getRevenue(),     // 7-day daily revenue with graph
  ]);

  // paginated recent users
  const [recentUsers, recentUsersTotal] = await this.userRepo.findAndCount({
    where: { deletedAt: null },
    skip,
    take: limit,
    order: { createdAt: 'DESC' },
  });

  const [activeTrips, activeTripsTotal] = await this.tripRepo.findAndCount({
    where: { status: TripStatus.ACTIVE as any },
    relations: ['driver.user', 'vehicle'],
    skip,
    take: limit,
    order: { createdAt: 'DESC' },
  });

  const [completedTrips, completedTotal] = await this.tripRepo.findAndCount({
    where: { status: TripStatus.COMPLETED as any },
    relations: ['driver.user', 'vehicle'],
    skip,
    take: limit,
    order: { createdAt: 'DESC' },
  });

  return {
    users: {
      total: totalUsers,
      drivers: totalDrivers,
      passengers: totalPassengers,
      agents: totalAgents,
      recent: recentUsers,
      totalRecentUsers: recentUsersTotal,
    },
    trips: { total: totalTrips },
    bookings: { total: totalBookings },
    finance: {
      totalRevenue: revenue.total_revenue,  
      pendingPayouts,
    },
    revenue: {                             
      total: revenue.total_revenue,
      graph_data: revenue.graph_data,
    },
    overviews,                               
    kyc: { pendingDocuments },
    activeTrips: {
      data: activeTrips,
      meta: {
        page,
        limit,
        count: activeTrips.length,
        pageCount: Math.ceil(activeTripsTotal / limit),
        totalRecords: activeTripsTotal,
      },
    },
    completedTrips: {
      data: completedTrips,
      meta: {
        page,
        limit,
        count: completedTrips.length,
        pageCount: Math.ceil(completedTotal / limit),
        totalRecords: completedTotal,
      },
    },
  };
}
  

  // ─── User Management ─────────────────────────────────────────────────────────

  async listUsers(query: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
  }): Promise<PagedDto<any>> {
    const { page = 1, limit = 20, search, role } = query;
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };
    if (search) where.email = ILike(`%${search}%`);
    if (role) where.role = role;

    const [data, total] = await this.userRepo.findAndCount({
      where,
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    const pagedDto = new PagedDto();
    pagedDto.data = data;
    pagedDto.meta = {
      page,
      limit,
      count: data.length,
      previousPage: page > 1 ? page - 1 : false,
      nextPage: skip + limit < total ? page + 1 : false,
      pageCount: Math.ceil(total / limit),
      totalRecords: total,
    };
    return pagedDto;
  }

  async getUser(id: string) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async suspendUser(id: string, reason?: string) {
    const user = await this.getUser(id);
    user.status = UserStatus.SUSPENDED;
    if (reason) user.metadata = { ...(user.metadata ?? {}), suspensionReason: reason };
    return this.userRepo.save(user);
  }

  async activateUser(id: string) {
    const user = await this.getUser(id);
    user.status = UserStatus.ACTIVE;
    return this.userRepo.save(user);
  }

    async activateDriver(id: string) {
    const user = await this.getDriverById(id);
    user.status = UserStatus.ACTIVE;
    return this.userRepo.save(user);
  }

  async getDriverDocumentHistory(driverId: string) {
  const driver = await this.driverRepo.findOne({ where: { id: driverId } });
  if (!driver) throw new NotFoundException('Driver not found');

  const documents = await this.docRepo.find({
    where: { driverId },
    order: { createdAt: 'DESC' },
  });

  return documents;
}
async fetchDriversDocuments(driverId: string) {
  const driver = await this.driverRepo.findOne({ where: { id: driverId } });
  if (!driver) throw new NotFoundException('Driver not found');

  // Returns only the latest document per type
  const documents = await this.docRepo
    .createQueryBuilder('doc')
    .where('doc.driverId = :driverId', { driverId })
    .orderBy('doc.createdAt', 'DESC')
    .getMany();

  // Group by documentType and return only the latest of each
  const latestByType = new Map<string, DocumentVerification>();
  for (const doc of documents) {
    if (!latestByType.has(doc.documentType)) {
      latestByType.set(doc.documentType, doc);
    }
  }

  return Array.from(latestByType.values());
}

async deleteDriverDocumentHistory(driverId: string): Promise<{ message: string; deleted: number }> {
  const driver = await this.driverRepo.findOne({ where: { id: driverId } });
  if (!driver) throw new NotFoundException('Driver not found');

  const result = await this.docRepo.delete({ driverId });

  return {
    message: 'Driver document history deleted successfully',
    deleted: result.affected ?? 0,
  };
}

async updateDriverDocuments(
  driverId: string,
  data: Partial<DocumentVerification>,
): Promise<{ message: string; updated: number }> {
  const driver = await this.driverRepo.findOne({ where: { id: driverId } });
  if (!driver) throw new NotFoundException('Driver not found');

  const result = await this.docRepo.update({ driverId }, data);

  return {
    message: 'Driver documents updated successfully',
    updated: result.affected ?? 0,
  };
}

async addDriverDocuments(
  driverId: string,
  dto: AddDriverDocumentsDto,
): Promise<DocumentVerification[]> {

  try{
        const driver = await this.driverRepo.findOne({ where: { id: driverId } });
   if (!driver) throw new NotFoundException('Driver not found');

  const documents = dto.documents.map((doc) =>
    this.docRepo.create({
      driverId,
      documentType: doc.documentType,
      documentUrl: doc.documentUrl,
      verificationData: doc.verificationData,
      status: DocumentStatus.PENDING, // new uploads start pending review
    }),
  );

  return this.docRepo.save(documents);
  }catch(error){
    console.log(error)
  }

}

  // ─── Driver / KYC Management ─────────────────────────────────────────────────

  async listPendingDocuments(query: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<PagedDto<any>>{

        const { page = 1, limit = 20, search } = query;
        const skip = (page - 1) * limit;

      const qb = this.docRepo
    .createQueryBuilder('doc')
    .leftJoinAndSelect('doc.driver', 'driver')
    .where('doc.status = :status', { status: DocumentStatus.PENDING })
    .orderBy('doc.createdAt', 'ASC')
    .skip(skip)
    .take(limit);

      if (search) {
    qb.andWhere('driver.email ILIKE :search', { search: `%${search}%` });
  }
  const [data, total] = await qb.getManyAndCount();

     const pagedDto = new PagedDto();
    pagedDto.data = data;
    pagedDto.meta = {
      page,
      limit,
      count: data.length,
      previousPage: page > 1 ? page - 1 : false,
      nextPage: skip + limit < total ? page + 1 : false,
      pageCount: Math.ceil(total / limit),
      totalRecords: total,
    };
    
    return pagedDto;
  }

  async approveDocument(docId: string, adminEmail: string) {
    const doc = await this.docRepo.findOne({
      where: { id: docId },
      relations: ['driver'],
    });
    if (!doc) throw new NotFoundException('Document not found');
    if (doc.status !== DocumentStatus.PENDING)
      throw new BadRequestException('Document is not pending');

    doc.status = DocumentStatus.APPROVED;
    doc.updatedBy = adminEmail;
    await this.docRepo.save(doc);

    // Check if all required docs are approved → update driver KYC status
    await this.recalculateDriverKyc(doc.driverId);
    return doc;
  }

  async rejectDocument(docId: string, reason: string, adminEmail: string) {
    const doc = await this.docRepo.findOne({ where: { id: docId } });
    if (!doc) throw new NotFoundException('Document not found');

    doc.status = DocumentStatus.REJECTED;
    doc.rejectionReason = reason;
    doc.updatedBy = adminEmail;
    return this.docRepo.save(doc);
  }

  private async recalculateDriverKyc(driverId: string) {
    const allDocs = await this.docRepo.find({ where: { driverId } });
    const allApproved =
      allDocs.length > 0 && allDocs.every((d) => d.status === DocumentStatus.APPROVED);

    if (allApproved) {
      await this.driverRepo.update(driverId, { kycComplete: KycStatus.COMPLETED });
    }
  }

  // ─── Trip Management ─────────────────────────────────────────────────────────

  async listTrips(query: { page?: number; limit?: number; status?: string }): Promise<PagedDto<any>> {
    const { page = 1, limit = 20, status } = query;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (status) where.status = status;

    const [data, total] = await this.tripRepo.findAndCount({
      where,
      skip,
      take: limit,
      relations: ['driver.user'],
      order: { createdAt: 'DESC' },
    });

    const pagedDto = new PagedDto();
    pagedDto.data = data;
    pagedDto.meta = {
      page,
      limit,
      count: data.length,
      previousPage: page > 1 ? page - 1 : false,
      nextPage: skip + limit < total ? page + 1 : false,
      pageCount: Math.ceil(total / limit),
      totalRecords: total,
    };

    return pagedDto;
  }

  async getTrip(id: string) {
    const trip = await this.tripRepo.findOne({
      where: { id },
      relations: ['driver.user', 'vehicle.driver'],
    });
    if (!trip) throw new NotFoundException('Trip not found');
    return trip;
  }

  // ─── Payout Management ───────────────────────────────────────────────────────

  async listPayouts(query: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<PagedDto<any>> {
    const { page = 1, limit = 20, status } = query;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (status) where.status = status;

    const [data, total] = await this.payoutRepo.findAndCount({
      where,
      skip,
      take: limit,
      relations: ['driver', 'driver.user'],
      order: { createdAt: 'DESC' },
    });

    const pagedDto = new PagedDto();
    pagedDto.data = data;
    pagedDto.meta = {
      page,
      limit,
      count: data.length,
      previousPage: page > 1 ? page - 1 : false,
      nextPage: skip + limit < total ? page + 1 : false,
      pageCount: Math.ceil(total / limit),
      totalRecords: total,
    };
    return pagedDto;

  }

  async approvePayout(payoutId: string, adminEmail: string) {
  const payout = await this.payoutRepo.findOne({
    where: { id: payoutId },
    relations: ['driver', 'beneficiary'],   // ← pull the beneficiary
  });
  if (!payout) throw new NotFoundException('Payout not found');
  if (payout.status !== PayoutStatus.PENDING)
    throw new BadRequestException('Payout is not pending');

  const beneficiary = payout.beneficiary;
  if (!beneficiary) throw new BadRequestException('No beneficiary attached to this payout');

  if (!beneficiary.bankName || !beneficiary.bankCode)
    throw new BadRequestException('Beneficiary bank details are missing');

  // 1. Reuse cached recipient, or create one
  let recipientCode = beneficiary.recipientCode;
  if (!recipientCode) {
    const created = await this.paystackAdapter.createTransferRecipient({
      name: beneficiary.bankName,
      account_number: beneficiary.accountNumber,
      bank_code: beneficiary.bankCode,
    });
    recipientCode = created.recipient_code;
    await this.beneficiaryRepo.update(beneficiary.id, { recipientCode });
  }

  // 2. Initiate transfer — all account data comes from the beneficiary
  const { transfer_code } = await this.paystackAdapter.initiatePayout({
    recipient_code: recipientCode,
    amount: payout.amount,
    reason: payout.reason || 'Payout',
    account_number: beneficiary.accountNumber,
    bank_code: beneficiary.bankCode,
  });

  // 3. Update the payout — only payout-level fields
  payout.status = PayoutStatus.PROCESSING;
  payout.recipientCode = recipientCode;
  payout.transferCode = transfer_code;
  payout.updatedBy = adminEmail;

  // 4. Deduct wallet (driver payouts only)
  if (payout.driverId) {
    await this.driverRepo.decrement({ id: payout.driverId }, 'walletBalance', payout.amount);
  }

  return this.payoutRepo.save(payout);
}

  async declinePayout(payoutId: string, reason: string, adminEmail: string) {
    const payout = await this.payoutRepo.findOne({ where: { id: payoutId } });
    if (!payout) throw new NotFoundException('Payout not found');
    if (payout.status !== PayoutStatus.PENDING)
      throw new BadRequestException('Payout is not pending');

    payout.status = PayoutStatus.DECLINED;
    payout.reason = reason;
    payout.updatedBy = adminEmail;
    return this.payoutRepo.save(payout);
  }

  // ─── Coupon Management ───────────────────────────────────────────────────────

  async createCoupon(dto: {
    code: string;
    type: CouponType;
    value: number;
    maxDiscount?: number;
    minOrderAmount?: number;
    usageLimit?: number;
    expiresAt?: string;
    adminId: number;
  }) {
    const existing = await this.couponRepo.findOne({ where: { code: dto.code.toUpperCase() } });
    if (existing) throw new BadRequestException('Coupon code already exists');

    const coupon = this.couponRepo.create({
      ...dto,
      code: dto.code.toUpperCase(),
      status: CouponStatus.ACTIVE,
      createdByAdminId: String(dto.adminId),
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
    });

    return this.couponRepo.save(coupon);
  }

  async deactivateCoupon(id: string) {
    const coupon = await this.couponRepo.findOne({ where: { id } });
    if (!coupon) throw new NotFoundException('Coupon not found');
    coupon.isActive = false;
    coupon.status = CouponStatus.INACTIVE;
    return this.couponRepo.save(coupon);
  }

async listCoupons(query: {
  page?: number;
  limit?: number;
  status?: string;
}): Promise<PagedDto<any>> {
  const { page = 1, limit = 20, status } = query;
  const skip = (page - 1) * limit;
  const where: any = {};
  if (status) where.status = status;

  const [data, total] = await this.couponRepo.findAndCount({
    where,
    skip,
    take: limit,
    order: { createdAt: 'DESC' },
  });

      const pagedDto = new PagedDto();
    pagedDto.data = data;
    pagedDto.meta = {
      page,
      limit,
      count: data.length,
      previousPage: page > 1 ? page - 1 : false,
      nextPage: skip + limit < total ? page + 1 : false,
      pageCount: Math.ceil(total / limit),
      totalRecords: total,
    };
    return pagedDto; 
}

  // ─── Booking Management ──────────────────────────────────────────────────────

  async listBookings(query: { page?: number; limit?: number; status?: string }): Promise<PagedDto<any>> {
    const { page = 1, limit = 20, status } = query;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (status) where.status = status;

    const [data, total] = await this.bookingRepo.findAndCount({
      where,
      skip,
      take: limit,
      relations: ['trip', 'passenger', 'passenger.user'],
      order: { createdAt: 'DESC' },
    });

       const pagedDto = new PagedDto();
    pagedDto.data = data;
    pagedDto.meta = {
      page,
      limit,
      count: data.length,
      previousPage: page > 1 ? page - 1 : false,
      nextPage: skip + limit < total ? page + 1 : false,
      pageCount: Math.ceil(total / limit),
      totalRecords: total,
    };

    return pagedDto;
  }

  async refundBooking(bookingId: string, adminEmail: string) {
    const booking = await this.bookingRepo.findOne({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');
    if (!booking.paymentReference) throw new BadRequestException('No payment reference found');

    // Issue refund via Paystack
    await (this.paystackAdapter as any).initiateRefund(
      booking.paymentReference,
      booking.amountPaid,
    );

    booking.status = 'refunded' as any;
    booking.paymentStatus = 'refunded' as any;
    booking.updatedBy = adminEmail;
    return this.bookingRepo.save(booking);
  }

  reviewDocument(docId: string, approve: boolean, reason: string, email: string) {
    return approve ? this.approveDocument(docId, email) : this.rejectDocument(docId, reason, email);
  }

  getBooking(id: string) {
    return this.bookingRepo.findOne({
      where: { id },
      relations: ['trip', 'passenger', 'passenger.user'],
    });
  }

async findByIdWithPassword(adminId: string): Promise<Admin> {
  const admin = await this.adminRepository.findOne({
    where: { id: adminId },
    select: ['id', 'email', 'password'],
  });
  if (!admin) throw new NotFoundException('Admin not found');
  return admin;
}

async updatePassword(
  adminId: string,
  hashedPassword: string,
): Promise<{ message: string }> {
  await this.adminRepository.update(adminId, { password: hashedPassword });
  return { message: 'Password updated successfully' };
}



// ─── Financial ───────────────────────────────────────────────────────────────

async getFinancialReport(query: { page?: number; limit?: number } = {}) {
  const { page = 1, limit = 50 } = query;
  const skip = (page - 1) * limit;

  // Pending withdrawal counts by type
  const [
    totalAgentPendingWithdrawals,
    totalDriverPendingWithdrawals,
    totalPassengerPendingWithdrawals,
  ] = await Promise.all([
    this.payoutRepo.count({
      where: { status: PayoutStatus.PENDING, payoutableType: 'agent' },
    }),
    this.payoutRepo.count({
      where: { status: PayoutStatus.PENDING, payoutableType: 'driver' },
    }),
    this.payoutRepo.count({
      where: { status: PayoutStatus.PENDING, payoutableType: 'passenger' },
    }),
  ]);

  // Pending withdrawal amounts by type
  const [agentAmountResult, driverAmountResult, passengerAmountResult] = await Promise.all([
    this.payoutRepo
      .createQueryBuilder('p')
      .select('SUM(p.amount)', 'total')
      .where('p.status = :status', { status: PayoutStatus.PENDING })
      .andWhere('p.payoutType = :type', { type: 'agent' })
      .getRawOne(),
    this.payoutRepo
      .createQueryBuilder('p')
      .select('SUM(p.amount)', 'total')
      .where('p.status = :status', { status: PayoutStatus.PENDING })
      .andWhere('p.payoutType = :type', { type: 'driver' })
      .getRawOne(),
    this.payoutRepo
      .createQueryBuilder('p')
      .select('SUM(p.amount)', 'total')
      .where('p.status = :status', { status: PayoutStatus.PENDING })
      .andWhere('p.payoutType = :type', { type: 'passenger' })
      .getRawOne(),
  ]);

  // Platform earnings (sum of all successful booking platform fees)
  const platformEarningResult = await this.bookingRepo
    .createQueryBuilder('b')
    .select('SUM(b.platformFee)', 'total')
    .where('b.paymentStatus = :s', { s: 'success' })
    .getRawOne();

  // Recent payouts (last 50)
  const recentPayouts = await this.payoutRepo.find({
    relations: ['driver.user', 'agent.user', 'beneficiary'],
    order: { createdAt: 'DESC' },
    skip,
    take: limit,
  });

  const allPayouts = recentPayouts.map((p) => ({
    id: p.id,
    type: 'payout',
    amount: Number(p.amount ?? 0) / 100,
    status: p.status,
    reference: p.reference,
    transfer_code: p.transferCode,
    reason: p.reason,
    paid_to: p.driver?.user
      ? {
          id: p.driver.user.id,
          first_name: p.driver.user.firstName,
          last_name: p.driver.user.lastName,
          email: p.driver.user.email,
          phone: p.driver.user.phone,
          profile_image: p.driver.user.profileImage,
        }
      : p.agent?.user
        ? {
            id: p.agent.user.id,
            first_name: p.agent.user.firstName,
            last_name: p.agent.user.lastName,
            email: p.agent.user.email,
            phone: p.agent.user.phone,
            profile_image: p.agent.user.profileImage,
          }
        : null,
    created_at: p.createdAt,
    updated_at: p.updatedAt,
  }));

  const revenue = await this.getRevenue();

  return {
    total_agent_pending_withdrawals: totalAgentPendingWithdrawals,
    total_driver_pending_withdrawals: totalDriverPendingWithdrawals,
    total_passenger_pending_withdrawals: totalPassengerPendingWithdrawals,
    total_agent_pending_withdrawals_amount: parseFloat(agentAmountResult?.total ?? '0') / 100,
    total_driver_pending_withdrawals_amount: parseFloat(driverAmountResult?.total ?? '0') / 100,
    total_passenger_pending_withdrawals_amount: parseFloat(passengerAmountResult?.total ?? '0') / 100,
    platform_earnings: parseFloat(platformEarningResult?.total ?? '0'),
    all_payouts: allPayouts,
    revenue,
  };
}

// ─── Revenue Graph (filter: daily | monthly | yearly) ─────────────────────

async getRevenueGraph(filter: 'daily' | 'monthly' | 'yearly' = 'monthly') {
  const now = new Date();

  const qb = this.bookingRepo
    .createQueryBuilder('b')
    .where('b.paymentStatus = :s', { s: 'success' });

  // Apply filter
  if (filter === 'daily') {
    qb.andWhere('DATE(b.createdAt) = CURRENT_DATE');
  } else if (filter === 'monthly') {
    qb.andWhere('EXTRACT(MONTH FROM b.createdAt) = :month', { month: now.getMonth() + 1 })
      .andWhere('EXTRACT(YEAR FROM b.createdAt) = :year', { year: now.getFullYear() });
  } else if (filter === 'yearly') {
    qb.andWhere('EXTRACT(YEAR FROM b.createdAt) = :year', { year: now.getFullYear() });
  }

  const totalRevenueResult = await qb
    .select('SUM(b.amountPaid)', 'total')
    .getRawOne();

  // Graph breakdown
  const graphSelect =
    filter === 'yearly'
      ? "TO_CHAR(b.createdAt, 'YYYY')"
      : filter === 'monthly'
        ? "TO_CHAR(b.createdAt, 'YYYY-MM')"
        : "TO_CHAR(b.createdAt, 'YYYY-MM-DD')";

  const graphData = await this.bookingRepo
    .createQueryBuilder('b')
    .select(graphSelect, 'period')
    .addSelect('SUM(b.amountPaid)', 'total')
    .where('b.paymentStatus = :s', { s: 'success' })
    .groupBy('period')
    .orderBy('period', 'ASC')
    .getRawMany();

  return {
    total_revenue: parseFloat(totalRevenueResult?.total ?? '0') / 100,
    revenue_graph: graphData.map((g) => ({
      period: g.period,
      total: parseFloat(g.total ?? '0') / 100,
    })),
  };
}

// ─── Transaction History ──────────────────────────────────────────────────────

async getTransactionHistory(query: {
  page?: number;
  limit?: number;
  status?: string;
}) {
  const { page = 1, limit = 10, status } = query;
  const skip = (page - 1) * limit;

  const [data, total] = await this.payoutRepo.findAndCount({
    where: { status: PayoutStatus.APPROVED },
    relations: ['driver.user', 'agent.user', 'beneficiary'],
    skip,
    take: limit,
    order: { createdAt: 'DESC' },
  });

  const pagedDto = new PagedDto();
  pagedDto.data = data.map((p) => ({
    id: p.id,
    amount: Number(p.amount ?? 0) / 100,
    status: p.status,
    reference: p.reference,
    reason: p.reason,
    recipient: p.driver?.user
      ? `${p.driver.user.firstName} ${p.driver.user.lastName}`
      : p.agent?.user
        ? `${p.agent.user.firstName} ${p.agent.user.lastName}`
        : 'Unknown',
    created_at: p.createdAt,
  }));
  pagedDto.meta = {
    page,
    limit,
    count: data.length,
    previousPage: page > 1 ? page - 1 : false,
    nextPage: skip + limit < total ? page + 1 : false,
    pageCount: Math.ceil(total / limit),
    totalRecords: total,
  };

  return pagedDto;
}

// ─── Refund Requests ─────────────────────────────────────────────────────────

async getRefundRequests(query: {
  page?: number;
  limit?: number;
  type?: 'passenger' | 'driver';
  search?: string;
}) {
  const { page = 1, limit = 15, type, search } = query;
  const skip = (page - 1) * limit;

  const qb = this.payoutRepo
    .createQueryBuilder('p')
    .leftJoinAndSelect('p.driver', 'driver')
    .leftJoinAndSelect('driver.user', 'driverUser')
    .leftJoinAndSelect('p.beneficiary', 'beneficiary')
    .where('p.payoutType != :agentType', { agentType: 'agent' }) // exclude agents
    .orderBy(
      `CASE WHEN p.status = '${PayoutStatus.PENDING}' THEN 0 ELSE 1 END`,
      'ASC',
    )
    .addOrderBy('p.createdAt', 'DESC')
    .skip(skip)
    .take(limit);

  if (type === 'passenger') {
    qb.andWhere('p.payoutType = :type', { type: 'passenger' });
  } else if (type === 'driver') {
    qb.andWhere('p.payoutType = :type', { type: 'driver' });
  }

  if (search) {
    qb.andWhere(
      '(p.reference ILIKE :search OR p.status ILIKE :search OR p.reason ILIKE :search)',
      { search: `%${search}%` },
    );
  }

  const [data, total] = await qb.getManyAndCount();

  const pagedDto = new PagedDto();
  pagedDto.data = data;
  pagedDto.meta = {
    page,
    limit,
    count: data.length,
    previousPage: page > 1 ? page - 1 : false,
    nextPage: skip + limit < total ? page + 1 : false,
    pageCount: Math.ceil(total / limit),
    totalRecords: total,
  };

  return pagedDto;
}

// ─── Drivers Earnings ─────────────────────────────────────────────────────────

async getDriversEarnings(query: {
  page?: number;
  limit?: number;
  search?: string;
}) {
  const { page = 1, limit = 10, search } = query;
  const skip = (page - 1) * limit;

  const qb = this.tripRepo
    .createQueryBuilder('trip')
    .leftJoinAndSelect('trip.driver', 'driver')
    .leftJoinAndSelect('driver.user', 'user')
    .leftJoinAndSelect('trip.vehicle', 'vehicle')
    .where('trip.status = :status', { status: TripStatus.COMPLETED })
    .orderBy('trip.createdAt', 'DESC')
    .skip(skip)
    .take(limit);

  if (search) {
    qb.andWhere(
      `(
        trip.departureLocation ILIKE :search OR
        trip.arrivalDestination ILIKE :search OR
        trip.departureDate::text ILIKE :search OR
        trip.status ILIKE :search OR
        user.firstName ILIKE :search OR
        user.lastName ILIKE :search OR
        user.email ILIKE :search
      )`,
      { search: `%${search}%` },
    );
  }

  const [data, total] = await qb.getManyAndCount();

  // Calculate earnings per trip from bookings
  const tripsWithEarnings = await Promise.all(
    data.map(async (trip) => {
      const earningsResult = await this.bookingRepo
        .createQueryBuilder('b')
        .select('SUM(b.amountPaid)', 'total')
        .where('b.tripId = :tripId', { tripId: trip.id })
        .andWhere('b.paymentStatus = :s', { s: 'success' })
        .getRawOne();

      return {
        trip_id: trip.id,
        departure_location: trip.departureLocation,
        arrival_location: trip.arrivalDestination,
        departure_date: trip.departureDate,
        departure_time: trip.departureTime,
        arrival_date: trip.arrivalDate,
        arrival_time: trip.arrivalTime,
        status: trip.status,
        driver: trip.driver?.user
          ? {
              id: trip.driver.id,
              name: `${trip.driver.user.firstName} ${trip.driver.user.lastName}`,
              email: trip.driver.user.email,
              phone: trip.driver.user.phone,
            }
          : null,
        total_earned: parseFloat(earningsResult?.total ?? '0') / 100,
      };
    }),
  );

  const pagedDto = new PagedDto();
  pagedDto.data = tripsWithEarnings;
  pagedDto.meta = {
    page,
    limit,
    count: data.length,
    previousPage: page > 1 ? page - 1 : false,
    nextPage: skip + limit < total ? page + 1 : false,
    pageCount: Math.ceil(total / limit),
    totalRecords: total,
  };

  return pagedDto;
}

// ─── Agents Earnings ──────────────────────────────────────────────────────────

async getAgentsEarnings(query: { page?: number; limit?: number }) {
  const { page = 1, limit = 10 } = query;
  const skip = (page - 1) * limit;

  const [data, total] = await this.payoutRepo.findAndCount({
    where: { payoutableType: 'agent' },
    relations: ['agent.user', 'beneficiary'],
    skip,
    take: limit,
    order: { createdAt: 'DESC' },
  });

  const pagedDto = new PagedDto();
  pagedDto.data = data.map((p) => ({
    id: p.id,
    amount: Number(p.amount ?? 0) / 100,
    status: p.status,
    reference: p.reference,
    agent: p.agent?.user
      ? {
          id: p.agent.id,
          name: `${p.agent.user.firstName} ${p.agent.user.lastName}`,
          email: p.agent.user.email,
        }
      : null,
    created_at: p.createdAt,
  }));
  pagedDto.meta = {
    page,
    limit,
    count: data.length,
    previousPage: page > 1 ? page - 1 : false,
    nextPage: skip + limit < total ? page + 1 : false,
    pageCount: Math.ceil(total / limit),
    totalRecords: total,
  };

  return pagedDto;
}



}
