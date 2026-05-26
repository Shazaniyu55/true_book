import {
  Body,
  Controller,
  Get,
  Patch,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';


import { PassengerOnly } from '@shared/decorators/roles.decorator';
import { ServiceName } from '@shared/decorators/servicename.decorators';
import { JwtPayload } from '../../../types/interfaces';
import { PassengerService } from '../services/passanger.service';
import { AuthUser } from '@shared/decorators/authUser.decorator';
import { UpdatePassengerProfileDto } from '../dtos/passanger.dto';

@ApiTags('Passenger')
@ApiBearerAuth()
@ServiceName('passenger')
@PassengerOnly()
@Controller('v1/passenger')
export class PassengerController {
  constructor(private readonly passengerService: PassengerService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get my passenger profile' })
  getProfile(@AuthUser() user: JwtPayload) {
    return this.passengerService.getProfile(user.sub);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update my profile (name, phone, photo, state)' })
  updateProfile(
    @AuthUser() user: JwtPayload,
    @Body() dto: UpdatePassengerProfileDto,
  ) {
    return this.passengerService.updateProfile(user.sub, dto);
  }

  @Get('dashboard')
  @ApiOperation({
    summary: 'Passenger dashboard',
    description: 'Returns profile info, booking counts (total/confirmed/completed/cancelled), and last 5 bookings.',
  })
  getDashboard(@AuthUser() user: JwtPayload) {
    return this.passengerService.getDashboard(user.sub);
  }
}