import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { RolesGuard } from '@shared/guards/roles.guard';
import { DriverOnly } from '@shared/decorators/roles.decorator';
import { AuthUser } from '@shared/decorators/authUser.decorator';
import { ServiceName } from '@shared/decorators/servicename.decorators';
import { Broker } from '@broker/broker';
import { GetMyVehicleUsecase } from '../usecase/getvehicle.usecase';
import { CreateVehicleDto, UpdateVehicleDto } from '../dto/vehicle.dto';
import { VehicleService } from '../service/vehicle.service';
import { UpdateVehicleUsecase } from '../usecase/updatevehicle.usecase';
import { DeleteVehicleUsecase } from '../usecase/deletevehicle.usecase';


@ApiTags('Vehicle')
@ApiBearerAuth()
@ServiceName('vehicle') // for kill-switch targeting
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('v1/vehicles')
export class VehicleController {
  constructor(
    private readonly broker: Broker,
    private readonly getMyVehicleUsecase: GetMyVehicleUsecase,
    private readonly vehicleService: VehicleService,
    private readonly updateVehicleUsecase:UpdateVehicleUsecase,
    private readonly deleteVehicleUsecase: DeleteVehicleUsecase
  ) {}


@DriverOnly()
@Post('register')
async registerVehicle(
  @AuthUser() user: any,
  @Body() dto: CreateVehicleDto,
) {
  return this.vehicleService.registerVehicle(user.id, dto);
}

  @DriverOnly()
  @Get('me')
  @ApiOperation({ summary: 'Driver: Get my registered vehicle' })
  getMine(@AuthUser() user: any) {
    return this.broker.runUsecases([this.getMyVehicleUsecase], { id: user.sub });
  }

  @DriverOnly()
@Patch('update-vehicle/:id')
@ApiOperation({ summary: 'Driver: Edit a registered vehicle' })
@ApiParam({ name: 'id', description: 'Vehicle ID' })
updateVehicle(
  @AuthUser() user: any,
  @Param('id') id: string,
  @Body() dto: UpdateVehicleDto,
) {
  return this.broker.runUsecases([this.updateVehicleUsecase], {
    userId: user.sub,
    vehicleId: id,
    dto,
  });
}

@DriverOnly()
@Delete('delete-vehicle/:id')
@ApiOperation({ summary: 'Driver: Delete a registered vehicle' })
@ApiParam({ name: 'id', description: 'Vehicle ID' })
deleteVehicle(@AuthUser() user: any, @Param('id') id: string) {
  return this.broker.runUsecases([this.deleteVehicleUsecase], {
    userId: user.sub,
    vehicleId: id,
  });
}
}