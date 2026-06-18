import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Driver } from '@modules/core/entities/driver.entity';
import { Vehicle } from '@modules/core/entities/vehicle.entity';
import { VehicleRepository } from '@adapters/repositories/vehicle.repository';
import { CreateVehicleDto } from '../dto/vehicle.dto';
import { CloudinaryService } from '@modules/cloudinary/services/cloudinary.service';

@Injectable()
export class VehicleService {
  constructor(
    private readonly vehicleRepo: VehicleRepository,
    @InjectRepository(Driver) private readonly driverRepo: Repository<Driver>,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async registerVehicle(
    userId: string,
    dto: CreateVehicleDto,
    em?: EntityManager,
  ) {
    const driver = await this.driverRepo.findOne({ where: { userId } });
    if (!driver) throw new NotFoundException('Driver profile not found');

    // const existing = await this.vehicleRepo.findByDriverId(driver.id);
    // if (existing) {
    //   throw new ConflictException('You already have a registered vehicle');
    // }

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
        vehiclePhoto: dto.vehiclePhoto ?? [],
        insurance: dto.insurance ?? null,
        registrationDoc: dto.registrationDoc ?? null,
      },
      em,
    );

    await this.driverRepo.update({ id: driver.id }, { vehicleId: vehicle.id });

    return vehicle;
  }

  //  async registerVehicle(
  //   userId: string,
  //   dto: CreateVehicleDto,
  //   files: {
  //     vehiclePhoto?: Express.Multer.File[];
  //     insurance?: Express.Multer.File[];
  //     registrationDoc?: Express.Multer.File[];
  //   },
  //   em?: EntityManager,
  // ) {
  //   const driver = await this.driverRepo.findOne({ where: { userId } });
  //   if (!driver) throw new NotFoundException('Driver profile not found');

  //   const existing = await this.vehicleRepo.findByDriverId(driver.id);
  //   if (existing) {
  //     throw new ConflictException('You already have a registered vehicle');
  //   }

  //   const plateTaken = await this.vehicleRepo.findByPlate(dto.plateNumber);
  //   if (plateTaken) {
  //     throw new BadRequestException('A vehicle with this plate number already exists');
  //   }

  //   // ── Upload photos to Cloudinary ──────────────────────────────────────
  //   const vehiclePhoto: string[] = [];

  //   if (files?.vehiclePhoto?.length) {
  //     for (const file of files.vehiclePhoto) {
  //       const uploaded = await this.cloudinaryService.upload(file, {
  //         folder: `vehicles/${driver.id}/photos`,
  //       });
  //       vehiclePhoto.push(uploaded.secure_url);
  //     }
  //   }

  //   let insuranceUrl: string | null = null;
  //   if (files?.insurance?.[0]) {
  //     const uploaded = await this.cloudinaryService.upload(files.insurance[0], {
  //       folder: `vehicles/${driver.id}/insurance`,
  //     });
  //     insuranceUrl = uploaded.secure_url;
  //   }

  //   let registrationDocUrl: string | null = null;
  //   if (files?.registrationDoc?.[0]) {
  //     const uploaded = await this.cloudinaryService.upload(files.registrationDoc[0], {
  //       folder: `vehicles/${driver.id}/registration`,
  //     });
  //     registrationDocUrl = uploaded.secure_url;
  //   }

  //   // ── Create vehicle ───────────────────────────────────────────────────
  //   const vehicle = await this.vehicleRepo.createVehicle(
  //     {
  //       ...dto,
  //       driverId: driver.id,
  //       isActive: true,
  //       isVerified: false,
  //       vehiclePhoto,
  //       insurance: insuranceUrl,
  //       registrationDoc: registrationDocUrl,
  //     },
  //     em,
  //   );

  //   await this.driverRepo.update({ id: driver.id }, { vehicleId: vehicle.id });

  //   return vehicle;
  // }

  async getMyVehicle(userId: string): Promise<Vehicle> {
    const driver = await this.driverRepo.findOne({ where: { userId } });
    if (!driver) throw new NotFoundException('Driver profile not found');

    const vehicle = await this.vehicleRepo.findByDriverId(driver.id);
    if (!vehicle) throw new NotFoundException('No vehicle registered');
    return vehicle;
  }
}