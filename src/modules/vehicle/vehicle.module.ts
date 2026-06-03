import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vehicle } from '@modules/core/entities/vehicle.entity';
import { Driver } from '@modules/core/entities/driver.entity';
import { VehicleRepository } from '@adapters/repositories/vehicle.repository';
import { Broker } from '@broker/broker';
import { VehicleController } from './controller/vehicle.controller';
import { VehicleService } from './service/vehicle.service';
import { CreateVehicleUsecase } from './usecase/createvehicle.usecase';
import { GetMyVehicleUsecase } from './usecase/getvehicle.usecase';


@Module({
  imports: [TypeOrmModule.forFeature([Vehicle, Driver])],
  controllers: [VehicleController],
  providers: [
    Broker,
    VehicleService,
    VehicleRepository,
    CreateVehicleUsecase,
    GetMyVehicleUsecase,
  ],
  exports: [VehicleService],
})
export class VehicleModule {}