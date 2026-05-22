import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Booking } from '@modules/core/entities/booking.entity';

@Injectable()
export class BookingRepository extends Repository<Booking> {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    private readonly entityManager: EntityManager,
  ) {
    super(bookingRepository.target, bookingRepository.manager, bookingRepository.queryRunner);
  }

  async createBooking(data: Partial<Booking>, entityManager?: EntityManager): Promise<Booking> {
    const manager = entityManager || this.entityManager;
    const booking = manager.create(Booking, data);
    return manager.save(Booking, booking);
  }

  async findByBookingCode(bookingCode: string): Promise<Booking> {
    return this.findOne({ where: { bookingCode }, relations: ['trip', 'passenger'] });
  }

  async findByPaymentReference(paymentReference: string): Promise<Booking> {
    return this.findOne({ where: { paymentReference } });
  }

  async updateBooking(id: number, data: Partial<Booking>, entityManager?: EntityManager): Promise<Booking> {
    const manager = entityManager || this.entityManager;
    await manager.update(Booking, id, data);
    return manager.findOne(Booking, { where: { id } });
  }
}
