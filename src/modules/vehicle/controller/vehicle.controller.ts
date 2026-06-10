import { Body, Controller, Get, Post, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { RolesGuard } from '@shared/guards/roles.guard';
import { DriverOnly } from '@shared/decorators/roles.decorator';
import { AuthUser } from '@shared/decorators/authUser.decorator';
import { ServiceName } from '@shared/decorators/servicename.decorators';
import { Broker } from '@broker/broker';
import { GetMyVehicleUsecase } from '../usecase/getvehicle.usecase';
import { CreateVehicleDto } from '../dto/vehicle.dto';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { VehicleService } from '../service/vehicle.service';


@ApiTags('Vehicle')
@ApiBearerAuth()
@ServiceName('vehicle') // for kill-switch targeting
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('v1/vehicles')
export class VehicleController {
  constructor(
    private readonly broker: Broker,
    private readonly getMyVehicleUsecase: GetMyVehicleUsecase,
    private readonly vehicleService: VehicleService
  ) {}

  // @DriverOnly()
  // @Post('register')
  // @ApiOperation({ summary: 'Driver: Register a vehicle (one per driver)' })
  // register(@AuthUser() user: any, @Body() dto: CreateVehicleDto) {
  //   return this.broker.runUsecases([this.createVehicleUsecase], { id: user.sub, dto });
  // }

@Post('register')
@UseInterceptors(
  FileFieldsInterceptor([
    { name: 'vehiclePhoto', maxCount: 5 },
    { name: 'insurance', maxCount: 1 },
    { name: 'registrationDoc', maxCount: 1 },
  ]),
)
async registerVehicle(
  @AuthUser() user: any,
  @Body() dto: CreateVehicleDto,
  @UploadedFiles()
  files: {
    vehiclePhoto?: Express.Multer.File[];
    insurance?: Express.Multer.File[];
    registrationDoc?: Express.Multer.File[];
  },
) {
  return this.vehicleService.registerVehicle(user.id, dto, files);
}

  @DriverOnly()
  @Get('me')
  @ApiOperation({ summary: 'Driver: Get my registered vehicle' })
  getMine(@AuthUser() user: any) {
    return this.broker.runUsecases([this.getMyVehicleUsecase], { id: user.sub });
  }
}