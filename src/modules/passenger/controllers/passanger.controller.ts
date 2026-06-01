import {
  Body,
  Controller,
  Get,
  Patch,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';



import { PassengerOnly } from '@shared/decorators/roles.decorator';
import { ServiceName } from '@shared/decorators/servicename.decorators';
import { JwtPayload } from '../../../types/interfaces';
import { PassengerService } from '../services/passanger.service';
import { AuthUser } from '@shared/decorators/authUser.decorator';
import { UpdatePassengerProfileDto } from '../dtos/passanger.dto';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { RolesGuard } from '@shared/guards/roles.guard';
import { Broker } from '@broker/broker';
import { GetPassengerProfileUsecase } from '../usecases/getprofile.usecase';
import { GetPassengerDashBoardUsecase } from '../usecases/getdashboard.usecase';

@ApiTags('Passenger')
@ApiBearerAuth()
@ServiceName('passenger')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('v1/passenger')
export class PassengerController {
  constructor(
    private readonly broker: Broker,
    private readonly passengerService: PassengerService,
    private readonly getPassengerProfileUsecase:GetPassengerProfileUsecase,
    private readonly getPassengerDashBoardUsecase:GetPassengerDashBoardUsecase
  
  ) {}


  @PassengerOnly()
  @Get('get-profile')
  @ApiOperation({ summary: 'Get my passenger profile' })
  getProfile(@AuthUser() user: JwtPayload) {
    return this.broker.runUsecases([this.getPassengerProfileUsecase], { id: user.sub });
  }

  @PassengerOnly()
  @Patch('update-profile')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Update my profile (name, phone, photo, state)' })
  updateProfile(
    @AuthUser() user: JwtPayload,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UpdatePassengerProfileDto,

  ) {
    return this.passengerService.updateProfile(user.sub, dto, file);
  }

  @PassengerOnly()
  @Get('dashboard')
  @ApiOperation({
    summary: 'Passenger dashboard',
    description: 'Returns profile info, booking counts (total/confirmed/completed/cancelled), and last 5 bookings.',
  })
  getDashboard(@AuthUser() user: JwtPayload) {
    return this.broker.runUsecases([this.getPassengerDashBoardUsecase], {id: user.sub})
    //return this.passengerService.getDashboard(user.sub);
  }
}