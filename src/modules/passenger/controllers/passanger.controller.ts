import {
  Body,
  Controller,
  Get,
  Patch,
  Delete,
  UseGuards,
  Post,
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
import { InitiatePaymentDto, UpdatePassengerProfileDto } from '../dtos/passanger.dto';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { RolesGuard } from '@shared/guards/roles.guard';
import { Broker } from '@broker/broker';
import { GetPassengerProfileUsecase } from '../usecases/getprofile.usecase';
import { GetPassengerDashBoardUsecase } from '../usecases/getdashboard.usecase';
import { DeleteUserAccountUsecase } from '../usecases/deleteacct.usecase';
import { DeleteUserDto } from '@modules/auth/dtos/deleteuser.dto';
import { InitiatePaymentUsecase } from '../usecases/initiatepayment.usecase';
import { GetBankListUsecase } from '../usecases/getbanklist.usecase';

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
    private readonly getPassengerDashBoardUsecase:GetPassengerDashBoardUsecase,
    private readonly deleteAccountUsecase:DeleteUserAccountUsecase,
    private readonly initiatePaymentUsecase:InitiatePaymentUsecase,
    private readonly getBankListUsecase: GetBankListUsecase
  
  ) {}


  @PassengerOnly()
  @Get('get-profile')
  @ApiOperation({ summary: 'Get my passenger profile' })
  getProfile(@AuthUser() user: JwtPayload) {
    return this.broker.runUsecases([this.getPassengerProfileUsecase], { id: user.sub });
  }

  @PassengerOnly()
  @Patch('update-profile')
  @ApiOperation({ summary: 'Update my profile (name, phone, photo, state)' })
  updateProfile(
    @AuthUser() user: JwtPayload,
    @Body() dto: UpdatePassengerProfileDto,

  ) {
    return this.passengerService.updateProfile(user.sub, dto);
  }

  @PassengerOnly()
  @Get('dashboard')
  @ApiOperation({
    summary: 'Passenger dashboard',
    description: 'Returns profile info, booking counts (total/confirmed/completed/cancelled), and last 5 bookings.',
  })
  getDashboard(@AuthUser() user: JwtPayload) {
    return this.broker.runUsecases([this.getPassengerDashBoardUsecase], {id: user.sub})
  }

  @PassengerOnly()
  @Delete('delete-acct')
  @ApiOperation({
    summary: 'delete my account',
    description: 'delete my account',
  })
  deleteAccount(@AuthUser() user: JwtPayload, dto: DeleteUserDto) {
    return this.broker.runUsecases([this.deleteAccountUsecase], {id: user.sub, dto: dto})
  }

@PassengerOnly()
@Post('payment/initiate')
@ApiOperation({ summary: 'Initiate payment for a booking' })
initiatePayment(@AuthUser() user: JwtPayload, @Body() dto: InitiatePaymentDto) {
  return this.broker.runUsecases([this.initiatePaymentUsecase], { id: user.sub, dto });
}

@PassengerOnly()
@Get('payment/banks')
@ApiOperation({ summary: 'Get supported bank list' })
getBanks() {
  return this.broker.runUsecases([this.getBankListUsecase], {});
}
}