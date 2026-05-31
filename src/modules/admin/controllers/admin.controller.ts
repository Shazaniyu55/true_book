import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { RolesGuard } from '@shared/guards/roles.guard';
import { AdminOnly } from '@shared/decorators/roles.decorator';
import { AuthUser } from '@shared/decorators/authUser.decorator';
import { Broker } from '@broker/broker';
import { KillSwitchService } from '../../kill-switch/kill-switch.service';
import { SkipKillSwitch } from '../../kill-switch/kill-switch.guard';
import {
  AdminListQueryDto,
  CreateCouponDto,
  DeclinePayoutDto,
  RejectDocumentDto,
  SuspendUserDto,
} from '../dtos/admin.dto';
import { CreateAdminDto } from '../dtos/create-admin.dto';
import { LoginAdminDto } from '../dtos/login.dto';
import { ToggleKillSwitchDto } from '../../kill-switch/kill-switch.dto';

// ─── Auth Usecases ───────────────────────────────────────────────────────────
import { RegisterAdminUsecase } from '../usecases/create.usecase';
import { LoginAdminUsecase } from '../usecases/login.usecase';

// ─── Dashboard ───────────────────────────────────────────────────────────────
import { GetDashboardUsecase } from '../usecases/getdashboard.usecase';

// ─── Users ───────────────────────────────────────────────────────────────────
import { ListUsersUsecase } from '../usecases/listuser.usecase';
import { GetUserUsecase } from '../usecases/getuser.usecase';
import { SuspendUserUsecase } from '../usecases/suspenduser.usecase';
import { ActivateUserUsecase } from '../usecases/activateuser.usecase';

// ─── Documents ───────────────────────────────────────────────────────────────
import {
  ApproveDocumentUsecase,
  ListPendingDocumentsUsecase,
  RejectDocumentUsecase,
} from '../usecases/document.usecase';

// ─── Trips ───────────────────────────────────────────────────────────────────
import { GetTripUsecase, ListTripsUsecase } from '../usecases/trip.usecase';

// ─── Bookings ────────────────────────────────────────────────────────────────
import {
  GetBookingUsecase,
  ListBookingsUsecase,
  RefundBookingUsecase,
} from '../usecases/booking.usecase';

// ─── Payouts ─────────────────────────────────────────────────────────────────
import {
  ApprovePayoutUsecase,
  DeclinePayoutUsecase,
  ListPayoutsUsecase,
} from '../usecases/payout.usecase';

// ─── Coupons ─────────────────────────────────────────────────────────────────
import {
  CreateCouponUsecase,
  DeactivateCouponUsecase,
  ListCouponsUsecase,
} from '../usecases/cupons.usecase';
import { ServiceName } from '@shared/decorators/servicename.decorators';
import { VerifyAdminOtpUsecase } from '../usecases/verifyadminotp.usecase';
import { VerifyOtpDto } from '@modules/auth/dtos/verify-otp.dto';
import { ACGuard, UseRoles } from 'nest-access-control';
import { Permission } from 'src/types/enums/permission.enums';


@ServiceName('admin') // For kill switch targeting
@ApiTags('Admin')
@UseGuards(JwtAuthGuard, RolesGuard, ACGuard)
@Controller('v1/admin')
export class AdminController {
  constructor(
    private readonly broker: Broker,
    private readonly killSwitchService: KillSwitchService,

    // Auth
    private readonly registerAdminUsecase: RegisterAdminUsecase,
    private readonly loginAdminUsecase: LoginAdminUsecase,
    private readonly verifyAdminOtp: VerifyAdminOtpUsecase,

    // Dashboard
    private readonly getDashboardUsecase: GetDashboardUsecase,

    // Users
    private readonly listUsersUsecase: ListUsersUsecase,
    private readonly getUserUsecase: GetUserUsecase,
    private readonly suspendUserUsecase: SuspendUserUsecase,
    private readonly activateUserUsecase: ActivateUserUsecase,

    // Documents
    private readonly listPendingDocumentsUsecase: ListPendingDocumentsUsecase,
    private readonly approveDocumentUsecase: ApproveDocumentUsecase,
    private readonly rejectDocumentUsecase: RejectDocumentUsecase,

    // Trips
    private readonly listTripsUsecase: ListTripsUsecase,
    private readonly getTripUsecase: GetTripUsecase,

    // Bookings
    private readonly listBookingsUsecase: ListBookingsUsecase,
    private readonly getBookingUsecase: GetBookingUsecase,
    private readonly refundBookingUsecase: RefundBookingUsecase,

    // Payouts
    private readonly listPayoutsUsecase: ListPayoutsUsecase,
    private readonly approvePayoutUsecase: ApprovePayoutUsecase,
    private readonly declinePayoutUsecase: DeclinePayoutUsecase,

    // Coupons
    private readonly listCouponsUsecase: ListCouponsUsecase,
    private readonly createCouponUsecase: CreateCouponUsecase,
    private readonly deactivateCouponUsecase: DeactivateCouponUsecase,
  ) {}

  // ─── Auth ────────────────────────────────────────────────────────────────────

  @Post('create')
  @ApiOperation({ summary: 'Create a new admin' })
  @ApiBody({ type: CreateAdminDto })
  createAdmin(@Body() dto: CreateAdminDto) {
    return this.broker.runUsecases([this.registerAdminUsecase], dto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Admin login' })
  @ApiBody({ type: LoginAdminDto })
  loginAdmin(@Body() dto: LoginAdminDto) {
    return this.broker.runUsecases([this.loginAdminUsecase], dto);
  }

  @Post('verify')
  @ApiOperation({summary: 'verify admin otp'})
  @ApiBody({type: VerifyOtpDto})
  verifyOtp(@Body() dto: VerifyOtpDto){
    return this.broker.runUsecases([this.verifyAdminOtp], dto)

  }

  // ─── Dashboard ───────────────────────────────────────────────────────────────

  @ApiBearerAuth()
  @AdminOnly()
  @Get('dashboard')
  @ApiOperation({ summary: 'Platform dashboard statistics' })
  getDashboard() {
    return this.broker.runUsecases([this.getDashboardUsecase], {});
  }

  // ─── Kill Switch ─────────────────────────────────────────────────────────────

  @ApiBearerAuth()
  @AdminOnly()
  @SkipKillSwitch()
  @Get('kill-switch')
  @ApiOperation({ summary: 'Get kill switch status' })
  getKillSwitchStatus() {
    return this.killSwitchService.getStatus();
  }

  @ApiBearerAuth()
  @AdminOnly()
  @SkipKillSwitch()
  @Post('kill-switch/activate')
  @ApiOperation({ summary: 'Activate kill switch — takes the API offline immediately' })
  activateKillSwitch(@Body() dto: ToggleKillSwitchDto, @AuthUser() user: any) {
    return this.killSwitchService.activate(user.email, dto.deactivationCode, dto.reason);
  }

  @ApiBearerAuth()
  @AdminOnly()
  @SkipKillSwitch()
  @Post('kill-switch/deactivate')
  @ApiOperation({ summary: 'Deactivate kill switch — requires deactivation code + 2FA' })
  deactivateKillSwitch(@Body() dto: ToggleKillSwitchDto, @AuthUser() user: any) {
    return this.killSwitchService.deactivate(user.email, dto.deactivationCode, dto.twoFaCode);
  }

  // ─── Users ───────────────────────────────────────────────────────────────────

  @ApiBearerAuth()
  @AdminOnly()
  @Get('users')
  @ApiOperation({ summary: 'List all users' })
  listUsers(@Query() query: AdminListQueryDto) {
    return this.broker.runUsecases([this.listUsersUsecase], query);
  }

  @ApiBearerAuth()
  @AdminOnly()
  @Get('users/:id')
  @ApiOperation({ summary: 'Get user by ID' })
  getUser(@Param('id', ParseIntPipe) id: number) {
    return this.broker.runUsecases([this.getUserUsecase], { id });
  }

  @ApiBearerAuth()
  @AdminOnly()
  @Patch('users/:id/suspend')
  @ApiOperation({ summary: 'Suspend a user account' })
  suspendUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SuspendUserDto,
  ) {
    return this.broker.runUsecases([this.suspendUserUsecase], {
      id,
      reason: dto.reason,
    });
  }

  @ApiBearerAuth()
  @AdminOnly()
  @Patch('users/:id/activate')
  @ApiOperation({ summary: 'Activate a user account' })
  activateUser(@Param('id', ParseIntPipe) id: number) {
    return this.broker.runUsecases([this.activateUserUsecase], { id });
  }

  // ─── KYC / Documents ─────────────────────────────────────────────────────────

  @ApiBearerAuth()
  @AdminOnly()
  @Get('documents/pending')
  @ApiOperation({ summary: 'List pending KYC documents' })
  listPendingDocuments() {
    return this.broker.runUsecases([this.listPendingDocumentsUsecase], {});
  }

  @ApiBearerAuth()
  @AdminOnly()
  @Patch('documents/:id/approve')
  @ApiOperation({ summary: 'Approve a KYC document' })
  approveDocument(@Param('id', ParseIntPipe) id: number, @AuthUser() user: any) {
    return this.broker.runUsecases([this.approveDocumentUsecase], {
      id,
      adminEmail: user.email,
    });
  }

  @ApiBearerAuth()
  @AdminOnly()
  @Patch('documents/:id/reject')
  @ApiOperation({ summary: 'Reject a KYC document' })
  rejectDocument(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RejectDocumentDto,
    @AuthUser() user: any,
  ) {
    return this.broker.runUsecases([this.rejectDocumentUsecase], {
      id,
      reason: dto.reason,
      adminEmail: user.email,
    });
  }

  // ─── Trips ───────────────────────────────────────────────────────────────────

  @ApiBearerAuth()
  @AdminOnly()
  @Get('trips')
  @ApiOperation({ summary: 'List all trips' })
  listTrips(@Query() query: AdminListQueryDto) {
    return this.broker.runUsecases([this.listTripsUsecase], query);
  }

  @ApiBearerAuth()
  @AdminOnly()
  @Get('trips/:id')
  @ApiOperation({ summary: 'Get trip detail' })
  getTrip(@Param('id', ParseIntPipe) id: number) {
    return this.broker.runUsecases([this.getTripUsecase], { id });
  }

  // ─── Bookings ────────────────────────────────────────────────────────────────

  @ApiBearerAuth()
  @AdminOnly()
  @Get('bookings')
  @ApiOperation({ summary: 'List all bookings' })
  listBookings(@Query() query: AdminListQueryDto) {
    return this.broker.runUsecases([this.listBookingsUsecase], query);
  }

  @ApiBearerAuth()
  @AdminOnly()
  @Get('bookings/:id')
  @ApiOperation({ summary: 'Get booking detail' })
  getBooking(@Param('id', ParseIntPipe) id: number) {
    return this.broker.runUsecases([this.getBookingUsecase], { id });
  }

  @ApiBearerAuth()
  @AdminOnly()
  @Patch('bookings/:id/refund')
  @ApiOperation({ summary: 'Issue a refund for a booking' })
  refundBooking(@Param('id', ParseIntPipe) id: number, @AuthUser() user: any) {
    return this.broker.runUsecases([this.refundBookingUsecase], {
      id,
      adminEmail: user.email,
    });
  }

  // ─── Payouts ─────────────────────────────────────────────────────────────────

  @ApiBearerAuth()
  @AdminOnly()
  @UseRoles({ resource: Permission.PAYOUT_VIEW, action: 'read', possession: 'any' })
  @Get('payouts')
  @ApiOperation({ summary: 'List all payout requests' })
  listPayouts(@Query() query: AdminListQueryDto) {
    return this.broker.runUsecases([this.listPayoutsUsecase], query);
  }

  @ApiBearerAuth()
  @AdminOnly()
  @UseRoles({ resource: Permission.PAYOUT_APPROVE, action: 'read', possession: 'any' })
  @Patch('payouts/:id/approve')
  @ApiOperation({ summary: 'Approve and execute a payout via Paystack' })
  approvePayout(@Param('id', ParseIntPipe) id: number, @AuthUser() user: any) {
    return this.broker.runUsecases([this.approvePayoutUsecase], {
      id,
      adminEmail: user.email,
    });
  }

  @ApiBearerAuth()
  @AdminOnly()
  @UseRoles({ resource: Permission.PAYOUT_DECLINE, action: 'read', possession: 'any' })

  @Patch('payouts/:id/decline')
  @ApiOperation({ summary: 'Decline a payout request' })
  declinePayout(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DeclinePayoutDto,
    @AuthUser() user: any,
  ) {
    return this.broker.runUsecases([this.declinePayoutUsecase], {
      id,
      reason: dto.reason,
      adminEmail: user.email,
    });
  }

  // ─── Coupons ─────────────────────────────────────────────────────────────────

  @ApiBearerAuth()
  @AdminOnly()
  @Get('coupons')
  @ApiOperation({ summary: 'List all coupons' })
  listCoupons() {
    return this.broker.runUsecases([this.listCouponsUsecase], {});
  }

  @ApiBearerAuth()
  @AdminOnly()
  @Post('coupons')
  @ApiOperation({ summary: 'Create a new coupon' })
  createCoupon(@Body() dto: CreateCouponDto, @AuthUser() user: any) {
    return this.broker.runUsecases([this.createCouponUsecase], {
      ...dto,
      adminId: user.id,
    });
  }

  @ApiBearerAuth()
  @AdminOnly()
  @Patch('coupons/:id/deactivate')
  @ApiOperation({ summary: 'Deactivate a coupon' })
  deactivateCoupon(@Param('id', ParseIntPipe) id: number) {
    return this.broker.runUsecases([this.deactivateCouponUsecase], { id });
  }
}