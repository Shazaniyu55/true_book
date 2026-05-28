import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Passenger } from '@modules/core/entities/passenger.entity';
import { UpdatePassengerProfileDto } from '@modules/passenger/dtos/passanger.dto';
import { User } from '@modules/core/entities/user.entity';
import { Booking } from '@modules/core/entities/booking.entity';
import { BookingStatus } from 'src/types/enums';

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

  async updatePassenger(
  id: string,
  dto: UpdatePassengerProfileDto,
  entityManager?: EntityManager,
): Promise<Passenger> {
  const manager = entityManager || this.entityManager;

  const passenger = await this.passengerRepository.findOne({
    where: { id },
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
  if (dto.profilePhoto) userUpdates.profilePhoto = dto.profilePhoto;

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
    await manager.update(Passenger, id, passengerUpdates);
  }

  // ---------------------------
  // Returns data
  // ---------------------------
  return await this.passengerRepository.findOne({
    where: { id },
    relations: ['user'],
  });
}


    async getProfile(id: string) {
      const passenger = await this.passengerRepository.findOne({
        where: { id },
        relations: ['users'],
      });
      if (!passenger) throw new NotFoundException('Passenger profile not found');
      return passenger;
    }


     async getDashboard(id: string) {
        const passenger = await this.passengerRepository.findOne({
          where: { id },
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

      async ensureProfile(id: string): Promise<Passenger> {
  const existing = await this.passengerRepository.findOne({ where: { id } });
  if (existing) return existing;

  return this.passengerRepository.save(
    this.passengerRepository.create({ id } as any),
  ) as unknown as Passenger;
}
     
}
