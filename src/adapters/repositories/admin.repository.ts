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
  UserStatus,
} from 'src/types/enums';
import { Role } from '@modules/core/entities/role.entity';
import { PagedDto } from '@shared/interface/paged.interface';
import { Agent } from '@modules/core/entities/agent.entity';
import { AddDriverDocumentsDto } from '@modules/admin/dtos/adddoc.dto';

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
      '(driver.email ILIKE :search OR user.firstName ILIKE :search OR user.lastName ILIKE :search)',
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
  const driver = await this.driverRepo.findOne({
    where: { id },
    relations: ['user', 'documents', 'vehicle'],
  });
  if (!driver) throw new NotFoundException('Driver not found');
  return driver;
}

  // ─── Dashboard ───────────────────────────────────────────────────────────────

  async getDashboardStats(query: { page?: number; limit?: number } = {}) {
      const { page = 1, limit = 20 } = query;
  const skip = (page - 1) * limit;

    const [
      totalUsers,
      totalDrivers,
      totalPassengers,
      totalTrips,
      totalBookings,
      pendingPayouts,
      pendingDocuments,
      totalAgents,

    ] = await Promise.all([
      this.userRepo.count({ where: { deletedAt: null } }),
      this.driverRepo.count({ where: { deletedAt: null } }),
      this.passengerRepo.count({ where: { deletedAt: null } }),
      this.tripRepo.count({ where: { deletedAt: null } }),
      this.bookingRepo.count({ where: { deletedAt: null } }),
      this.payoutRepo.count({ where: { status: PayoutStatus.PENDING } }),
      this.docRepo.count({ where: { status: DocumentStatus.PENDING } }),
      this.agentRepo.count({where: {deletedAt: null}})
    ]);

    // Revenue: sum of all paid bookings
    const revenueResult = await this.bookingRepo
      .createQueryBuilder('b')
      .select('SUM(b.amountPaid)', 'total')
      .where('b.paymentStatus = :s', { s: 'success' })
      .getRawOne();

    const graphData = await this.bookingRepo
  .createQueryBuilder('b')
  .select("TO_CHAR(b.createdAt, 'YYYY-MM')", 'month')
  .addSelect('SUM(b.amountPaid)', 'total')
  .where('b.paymentStatus = :s', { s: 'success' })
  .groupBy('month')
  .orderBy('month', 'ASC')
  .getRawMany();  

        // paginated recent users
  const [recentUsers, recentUsersTotal] = await this.userRepo.findAndCount({
    where: { deletedAt: null },
    skip,
    take: limit,
    order: { createdAt: 'DESC' },
  });

  const [activeTrips, activeTripsTotal] = await this.tripRepo.findAndCount({
    where: { status: 'active' as any },
    relations: ['driver', 'vehicle'],
    skip,
    take: limit,
    order: { createdAt: 'DESC' },
  });

    const [completedTrips, completedTotal] = await this.tripRepo.findAndCount({
    where: { status: 'completed' as any },
    relations: ['driver', 'vehicle'],
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
      recent:recentUsers,
      totalRecentUsers: recentUsersTotal
    },
    trips: { total: totalTrips },
    bookings: { total: totalBookings },
    finance: {
      totalRevenue: parseFloat(revenueResult?.total ?? '0'),
      pendingPayouts,
    },
    graphData: graphData.map((g) => ({
      month: g.month,
      total: parseFloat(g.total ?? '0'),
    })),
    
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

    completedTrips:{
      data: completedTrips,
      meta:{
        page,
        limit,
        count: completedTrips.length,
        pageCount: Math.ceil(completedTotal/limit),
        totalRecords: completedTotal
      }
    }
  };

    // return {
    //   users: { total: totalUsers, drivers: totalDrivers, passengers: totalPassengers },
    //   trips: { total: totalTrips },
    //   bookings: { total: totalBookings },
    //   finance: {
    //     totalRevenue: parseFloat(revenueResult?.total ?? '0'),
    //     pendingPayouts,
    //   },
    //   kyc: { pendingDocuments },
    // };
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
      await this.driverRepo.update(driverId, { kycStatus: KycStatus.COMPLETED });
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
      relations: ['driver'],
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
      relations: ['driver', 'vehicle'],
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
      relations: ['driver'],
    });
    if (!payout) throw new NotFoundException('Payout not found');
    if (payout.status !== PayoutStatus.PENDING)
      throw new BadRequestException('Payout is not pending');

    const driver = await this.driverRepo.findOne({ where: { id: payout.id } });
    if (!driver) throw new NotFoundException('Driver not found');

    if (!driver.bankAccountNumber || !driver.bankCode)
      throw new BadRequestException('Driver bank details are missing');

    // 1. Create transfer recipient
    const { recipient_code } = await this.paystackAdapter.createTransferRecipient({
      name: driver.bankAccountName,
      account_number: driver.bankAccountNumber,
      bank_code: driver.bankCode,
    });

    // 2. Initiate transfer
    const { transfer_code } = await this.paystackAdapter.initiatePayout({
      recipient_code,
      amount: payout.amount,
      reason: payout.reason || 'Driver payout',
      account_number: driver.bankAccountNumber,
      bank_code: driver.bankCode,
    });

    // 3. Update payout record
    payout.status = PayoutStatus.PROCESSING;
    payout.recipientCode = recipient_code;
    payout.transferCode = transfer_code;
    payout.updatedBy = adminEmail;

    // 4. Deduct from driver wallet
    await this.driverRepo.decrement({ id: driver.id }, 'walletBalance', payout.amount);

    return this.payoutRepo.save(payout);
  }

  async declinePayout(payoutId: string, reason: string, adminEmail: string) {
    const payout = await this.payoutRepo.findOne({ where: { id: payoutId } });
    if (!payout) throw new NotFoundException('Payout not found');
    if (payout.status !== PayoutStatus.PENDING)
      throw new BadRequestException('Payout is not pending');

    payout.status = PayoutStatus.DECLINED;
    payout.declineReason = reason;
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



}
