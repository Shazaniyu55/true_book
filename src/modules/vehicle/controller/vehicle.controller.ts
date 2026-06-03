import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { RolesGuard } from '@shared/guards/roles.guard';
import { DriverOnly } from '@shared/decorators/roles.decorator';
import { AuthUser } from '@shared/decorators/authUser.decorator';
import { ServiceName } from '@shared/decorators/servicename.decorators';
import { Broker } from '@broker/broker';
import { CreateVehicleUsecase } from '../usecase/createvehicle.usecase';
import { GetMyVehicleUsecase } from '../usecase/getvehicle.usecase';
import { CreateVehicleDto } from '../dto/vehicle.dto';


@ApiTags('Vehicle')
@ApiBearerAuth()
@ServiceName('vehicle') // for kill-switch targeting
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('v1/vehicles')
export class VehicleController {
  constructor(
    private readonly broker: Broker,
    private readonly createVehicleUsecase: CreateVehicleUsecase,
    private readonly getMyVehicleUsecase: GetMyVehicleUsecase,
  ) {}

  @DriverOnly()
  @Post('register')
  @ApiOperation({ summary: 'Driver: Register a vehicle (one per driver)' })
  register(@AuthUser() user: any, @Body() dto: CreateVehicleDto) {
    return this.broker.runUsecases([this.createVehicleUsecase], { id: user.sub, dto });
  }

  @DriverOnly()
  @Get('me')
  @ApiOperation({ summary: 'Driver: Get my registered vehicle' })
  getMine(@AuthUser() user: any) {
    return this.broker.runUsecases([this.getMyVehicleUsecase], { id: user.sub });
  }
}