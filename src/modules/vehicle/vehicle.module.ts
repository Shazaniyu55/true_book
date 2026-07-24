import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vehicle } from '@modules/core/entities/vehicle.entity';
import { Driver } from '@modules/core/entities/driver.entity';
import { VehicleRepository } from '@adapters/repositories/vehicle.repository';
import { Broker } from '@broker/broker';
import { VehicleController } from './controller/vehicle.controller';
import { VehicleService } from './service/vehicle.service';
import { GetMyVehicleUsecase } from './usecase/getvehicle.usecase';
import { CloudinaryModule } from '@modules/cloudinary/cloudinary.module';
import { Trip } from '@modules/core/entities/trip.entity';
import { UpdateVehicleUsecase } from './usecase/updatevehicle.usecase';
import { DeleteVehicleUsecase } from './usecase/deletevehicle.usecase';


@Module({
  imports: [TypeOrmModule.forFeature([Vehicle, Driver, Trip]), CloudinaryModule,],
  controllers: [VehicleController],
  providers: [
    Broker,
    VehicleService,
    VehicleRepository,
    GetMyVehicleUsecase,
    UpdateVehicleUsecase,
    DeleteVehicleUsecase
  ],
  exports: [VehicleService],
})
export class VehicleModule {}