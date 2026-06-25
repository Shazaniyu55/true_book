import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Passenger } from '@modules/core/entities/passenger.entity';
import { UpdatePassengerProfileDto } from '@modules/passenger/dtos/passanger.dto';
import { User } from '@modules/core/entities/user.entity';
import { Booking } from '@modules/core/entities/booking.entity';
import { BookingStatus } from 'src/types/enums';
import { DeleteUserDto } from '@modules/auth/dtos/deleteuser.dto';

@Injectable()
export class PassengerRepository extends Repository<Passenger> {
  constructor(

  private readonly entityManager: EntityManager,
  @InjectRepository(Passenger) private readonly passengerRepository: Repository<Passenger>,
  @InjectRepository(User) private readonly userRepo: Repository<User>,
   @InjectRepository(Booking) private readonly bookingRepo: Repository<Booking>,
  

  ) {
    super(passengerRepository.target, passengerRepository.manager, passengerRepository.queryRunner);
  }

  async createPassenger(data: Partial<Passenger>, entityManager?: EntityManager): Promise<Passenger> {
    const manager = entityManager || this.entityManager;
    const passenger = manager.create(Passenger, data);
    return manager.save(Passenger, passenger);
  }

  async findByUserId(id: string): Promise<Passenger> {
    return this.findOne({ where: { id }, relations: ['users'] });
  }

//   async updatePassenger(
//   id: string,
//   dto: UpdatePassengerProfileDto,
//   entityManager?: EntityManager,
// ): Promise<Passenger> {
//   const manager = entityManager || this.entityManager;

//   const passenger = await this.passengerRepository.findOne({
//     where: { user: {id} },
//     relations: ['user'],
//   });

//   if (!passenger) {
//     throw new NotFoundException('Passenger profile not found');
//   }

//   // ---------------------------
//   // Update User fields
//   // ---------------------------
//   const userUpdates: Partial<User> = {};

//   if (dto.firstName) userUpdates.firstName = dto.firstName;
//   if (dto.lastName) userUpdates.lastName = dto.lastName;
//   if (dto.phone) userUpdates.phone = dto.phone;
//   if (dto.fullName) userUpdates.lastName = dto.fullName;
//   if (dto.profileImage) userUpdates.profileImage = dto.profileImage;

//   if (Object.keys(userUpdates).length > 0) {
//     await manager.update(User, passenger.user.id, userUpdates);
//   }

//   // ---------------------------
//   // Update Passenger fields
//   // ---------------------------
//   const passengerUpdates: Partial<Passenger> = {};

//   if (dto.state) {
//     passengerUpdates.metadata = {
//       ...(passenger.metadata ?? {}),
//       state: dto.state,
//     };
//   }

//   if (Object.keys(passengerUpdates).length > 0) {
//     await manager.update(Passenger, id, passengerUpdates);
//   }

//   // ---------------------------
//   // Returns data
//   // ---------------------------
//   return await this.passengerRepository.findOne({
//     where: { id: id },
//     relations: ['user'],
//   });
// }

async updatePassenger(
  id: string, // this is the User id (user.sub from the JWT)
  dto: UpdatePassengerProfileDto,
  entityManager?: EntityManager,
): Promise<Passenger> {
  const manager = entityManager || this.entityManager;

  // Look up the passenger via the user relation, not by Passenger.id
  const passenger = await manager.findOne(Passenger, {
    where: { user: { id } },
    relations: ['user'],
  });

  if (!passenger) {
    throw new NotFoundException('Passenger profile not found');
  }

  // ---------------------------
  // Update User fields
  // ---------------------------
  const userUpdates: Partial<User> = {};

  if (dto.firstName) userUpdates.firstName = dto.firstName;
  if (dto.lastName) userUpdates.lastName = dto.lastName;
  if (dto.phone) userUpdates.phone = dto.phone;
  if (dto.profileImage) userUpdates.profileImage = dto.profileImage;

  // NOTE: handle fullName explicitly — don't dump it into lastName.
  // Adjust this to match what your User entity actually supports.
  if (dto.fullName) {
    const [firstName, ...rest] = dto.fullName.trim().split(/\s+/);
    userUpdates.firstName = firstName;
    if (rest.length > 0) userUpdates.lastName = rest.join(' ');
  }

  if (Object.keys(userUpdates).length > 0) {
    await manager.update(User, passenger.user.id, userUpdates);
  }

  // ---------------------------
  // Update Passenger fields
  // ---------------------------
  const passengerUpdates: Partial<Passenger> = {};

  if (dto.state) {
    passengerUpdates.metadata = {
      ...(passenger.metadata ?? {}),
      state: dto.state,
    };
  }

  if (Object.keys(passengerUpdates).length > 0) {
    await manager.update(Passenger, passenger.id, passengerUpdates);
  }

  // ---------------------------
  // Return updated data (use manager so it sees in-transaction changes)
  // ---------------------------
  return manager.findOne(Passenger, {
    where: { id: passenger.id },
    relations: ['user'],
  });
}


    async getProfile(userId: string) {
      const passenger = await this.passengerRepository.findOne({
        where: { userId },
        relations: ['user'],
      });
      if (!passenger) throw new NotFoundException('Passenger profile not found');
      return passenger;
    }


     async getDashboard(userId) {
        const passenger = await this.passengerRepository.findOne({
          where: { userId },
          relations: ['user'],
        });
        if (!passenger) throw new NotFoundException('Passenger profile not found');
    
        const [total, confirmed, completed, cancelled, pending] = await Promise.all([
          this.bookingRepo.count({ where: { passengerId: passenger.id } }),
          this.bookingRepo.count({ where: { passengerId: passenger.id, status: BookingStatus.CONFIRMED } }),
          this.bookingRepo.count({ where: { passengerId: passenger.id, status: BookingStatus.COMPLETED } }),
          this.bookingRepo.count({ where: { passengerId: passenger.id, status: BookingStatus.CANCELLED } }),
          this.bookingRepo.count({ where: { passengerId: passenger.id, status: BookingStatus.PENDING } }),
        ]);
    
        // Recent bookings (last 5)
        const recentBookings = await this.bookingRepo.find({
          where: { passengerId: passenger.id },
          relations: ['trip', 'trip.driver', 'trip.driver.user'],
          order: { createdAt: 'DESC' },
          take: 5,
        });
    
        return {
          profile: passenger,
          bookings: { total, confirmed, completed, cancelled, pending },
          recentBookings,
        };
      }

      async ensureProfile(userId: string): Promise<Passenger> {
  const existing = await this.passengerRepository.findOne({ where: { userId } });
  if (existing) return existing;

  return this.passengerRepository.save(
    this.passengerRepository.create({ userId } as any),
  ) as unknown as Passenger;
}

async deleteUser(id: string, data: DeleteUserDto, entityManager?: EntityManager): Promise<User> {
  const manager = entityManager || this.entityManager;
  const user = await manager.findOne(User, { where: { id } });
  if (!user) throw new NotFoundException('User not found');
  if (data && Object.keys(data).length > 0) {
    await manager.update(User, id, data);
  }

  await manager.softDelete(User, id);                         
  return manager.findOne(User, { where: { id }, withDeleted: true });
}
     
}
