import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Driver } from '@modules/core/entities/driver.entity';
import { Vehicle } from '@modules/core/entities/vehicle.entity';
import { VehicleRepository } from '@adapters/repositories/vehicle.repository';
import { CreateVehicleDto, UpdateVehicleDto } from '../dto/vehicle.dto';
import { CloudinaryService } from '@modules/cloudinary/services/cloudinary.service';
import { Trip } from '@modules/core/entities/trip.entity';
import { DocumentStatus, NotificationType, TripStatus } from 'src/types/enums';
import { NotificationService } from '@modules/notification/services/notification.service';

@Injectable()
export class VehicleService {
  constructor(
    private readonly vehicleRepo: VehicleRepository,
    @InjectRepository(Driver) private readonly driverRepo: Repository<Driver>,
    @InjectRepository(Trip) private readonly tripRepo: Repository<Trip>,
    private readonly cloudinaryService: CloudinaryService,
    private readonly notificationService: NotificationService
  ) {}

  async registerVehicle(
    userId: string,
    dto: CreateVehicleDto,
    em?: EntityManager,
  ) {
    const driver = await this.driverRepo.findOne({ where: { userId } });
    if (!driver) throw new NotFoundException('Driver profile not found');

    const plateTaken = await this.vehicleRepo.findByPlate(dto.plateNumber);
    if (plateTaken) {
      throw new BadRequestException('A vehicle with this plate number already exists');
    }

    // ── Create vehicle (URLs come from the client as strings) ────────────
    const vehicle = await this.vehicleRepo.createVehicle(
      {
        ...dto,
        driverId: driver.id,
        isActive: true,
        isVerified: false,
        type: dto.type,
        vehiclePhoto: dto.vehiclePhoto ?? [],
        insurance: dto.insurance ?? null,
        registrationDoc: dto.registrationDoc ?? null,
        verificationStatus: DocumentStatus.PENDING
      },
      em,
    );

    await this.driverRepo.update({ id: driver.id }, { vehicleId: vehicle.id });
    await this.notificationService.notify({
     userId: userId, 
  title: 'New Vehicle Registration',
  body: `A driver has registered a new vehicle with Name: ${driver.user.firstName}, Email: ${driver.user.email} plate number ${vehicle.plateNumber}.`,
  type: NotificationType.VEHICLE_REGISTRATION,
  data: {
    vehicleId: vehicle.id,
    driverId: driver.id,
    plateNumber: vehicle.plateNumber,
    verificationStatus: vehicle.verificationStatus,
  },
});

    return vehicle;
  }


  async getMyVehicle(userId: string): Promise<Vehicle[]> {
    const driver = await this.driverRepo.findOne({ where: { userId } });
    if (!driver) throw new NotFoundException('Driver profile not found');

    const vehicle = await this.vehicleRepo.findByDriverId(driver.id);
    if (!vehicle) throw new NotFoundException('No vehicle registered');
    return vehicle;
  }


  async updateVehicle(userId: string, vehicleId: string, dto: UpdateVehicleDto) {
  const vehicle = await this.getOwnedVehicle(userId, vehicleId);

  // plate must stay unique across the fleet
  if (dto.plateNumber && dto.plateNumber !== vehicle.plateNumber) {
    const plateTaken = await this.vehicleRepo.findByPlate(dto.plateNumber);
    if (plateTaken && plateTaken.id !== vehicle.id) {
      throw new BadRequestException('A vehicle with this plate number already exists');
    }
  }

  // changing plate / capacity / documents invalidates the previous approval
  const reverifyFields: (keyof UpdateVehicleDto)[] = [
    'plateNumber', 'capacity', 'insurance', 'registrationDoc',
  ];
  const needsReverification = reverifyFields.some(
    (f) => dto[f] !== undefined && dto[f] !== (vehicle as any)[f],
  );

  Object.assign(vehicle, {
    ...dto,
    ...(needsReverification ? { isVerified: false } : {}),
  });

  await this.notificationService.notifyAdmins({
  title: 'Vehicle Updated',
  body: `A driver  has updated his  vehicle with plate number ${vehicle.plateNumber}.`,
  type: NotificationType.VEHICLE_UPDATED,
  data: {
    firstName: vehicle.driver.user.firstName,
    email: vehicle.driver.user.email,
    driverId: userId,
    plateNumber: vehicle.plateNumber,
    verificationStatus: vehicle.verificationStatus,
  },
});
  return this.vehicleRepo.save(vehicle);
}

async deleteVehicle(userId: string, vehicleId: string) {
  const vehicle = await this.getOwnedVehicle(userId, vehicleId);

  // block deletion while the vehicle is committed to a live trip
  const liveTrips = await this.tripRepo.count({
    where: [
      { vehicleId: vehicle.id, status: TripStatus.PENDING },
      { vehicleId: vehicle.id, status: TripStatus.ACTIVE },
      { vehicleId: vehicle.id, status: TripStatus.STARTED },
    ],
  });
  if (liveTrips > 0) {
    throw new BadRequestException(
      'This vehicle is assigned to an upcoming or ongoing trip. Complete or cancel those trips first.',
    );
  }

  const driver = await this.driverRepo.findOne({ where: { userId } });

  // soft delete — historical trips keep pointing at the row
  await this.vehicleRepo.softDelete(vehicle.id);

  // if it was the driver's active vehicle, promote another one (or null)
  if (driver?.vehicleId === vehicle.id) {
    const remaining = await this.vehicleRepo.findOne({
      where: { driverId: driver.id },
      order: { createdAt: 'DESC' },
    });
    await this.driverRepo.update({ id: driver.id }, { vehicleId: remaining?.id ?? null });
  }
  await this.notificationService.notifyAdmins({
  title: 'Vehicle Deleted',
  body: `A driver has deleted his vehicle with plate number ${vehicle.plateNumber}.`,
  type: NotificationType.VEHICLE_DELETED,
  data: {
    name: vehicle.driver.user.firstName,
    email: vehicle.driver.user.email,
    driverId: driver.id,
    plateNumber: vehicle.plateNumber,
    verificationStatus: vehicle.verificationStatus,
  },
});

  return { id: vehicle.id, deleted: true };
}

private async getOwnedVehicle(userId: string, vehicleId: string): Promise<Vehicle> {
  const driver = await this.driverRepo.findOne({ where: { userId } });
  if (!driver) throw new NotFoundException('Driver profile not found');

  const vehicle = await this.vehicleRepo.findOne({ where: { id: vehicleId } });
  if (!vehicle) throw new NotFoundException('Vehicle not found');
  if (vehicle.driverId !== driver.id)
    throw new ForbiddenException('This vehicle does not belong to you');

  return vehicle;
}
}