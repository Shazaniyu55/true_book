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
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { RolesGuard } from '@shared/guards/roles.guard';
import { AdminOnly } from '@shared/decorators/roles.decorator';
import { AuthUser } from '@shared/decorators/authUser.decorator';
import { AdminService } from '../services/admin.service';
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
import { ToggleKillSwitchDto } from '../../kill-switch/kill-switch.dto';
import { Broker } from '@broker/broker';
import { RegisterAdminUsecase } from '../usecases/create.usecase';
import { LoginAdminUsecase } from '../usecases/login.usecase';
import { LoginAdminDto } from '../dtos/login.dto';

@ApiTags('Admin')
@Controller('v1/admin')
export class AdminController {
  constructor(
    private readonly broker: Broker,
    private readonly createAdminUsecase: RegisterAdminUsecase,
    private readonly loginAdminUsecase: LoginAdminUsecase,
    private readonly adminService: AdminService,
    private readonly killSwitchService: KillSwitchService,
  ) {}

  // ─── Admin Management ────────────────────────────────────────────────────────

  @Post('create')
  @ApiOperation({ summary: 'Create a new admin' })
  @ApiBody({ type: CreateAdminDto })
  @ApiResponse({ status: 200, description: 'Regusteration of admin successful.' })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
   createAdmin(@Body() dto: CreateAdminDto) {
    return  this.broker.runUsecases([this.createAdminUsecase],dto );
  }

  
  @Post('login')
  @ApiOperation({ summary: 'Login as an admin' })
  @ApiBody({ type: LoginAdminDto })
  @ApiResponse({ status: 200, description: 'Login successful.' })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
   loginAdmin(@Body() dto: LoginAdminDto) {
    return  this.broker.runUsecases([this.loginAdminUsecase],dto );
  }

  // ─── Dashboard ───────────────────────────────────────────────────────────────
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @AdminOnly()
  @Get('dashboard')
  @ApiOperation({ summary: 'Platform dashboard statistics' })
  @ApiResponse({ status: 200, description: ' successful.' })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  getDashboard() {
    return this.adminService.getDashboardStats();
  }

  // ─── Kill Switch ─────────────────────────────────────────────────────────────
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @AdminOnly()
  @SkipKillSwitch()
  @Get('kill-switch')
  @ApiOperation({ summary: 'Get kill switch status' })
  @ApiResponse({ status: 200, description: ' successful.' })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  getKillSwitchStatus() {
    return this.killSwitchService.getStatus();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @AdminOnly()
  @SkipKillSwitch()
  @Post('kill-switch/activate')
  @ApiOperation({ summary: 'Activate kill switch — takes the API offline immediately' })
  @ApiResponse({ status: 200, description: 'Kill switch activated successfully.' })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  activateKillSwitch(@Body() dto: ToggleKillSwitchDto, @AuthUser() user: any) {
    return this.killSwitchService.activate(user.email, dto.deactivationCode, dto.reason);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @AdminOnly()
  @SkipKillSwitch()
  @Post('kill-switch/deactivate')
  @ApiOperation({ summary: 'Deactivate kill switch — requires deactivation code + 2FA' })
  @ApiResponse({ status: 200, description: 'Kill switch deactivated successfully.' })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  deactivateKillSwitch(@Body() dto: ToggleKillSwitchDto, @AuthUser() user: any) {
    return this.killSwitchService.deactivate(user.email, dto.deactivationCode, dto.twoFaCode);
  }

  // ─── Users ───────────────────────────────────────────────────────────────────
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @AdminOnly()
  @Get('users')
  @ApiOperation({ summary: 'List all users' })
  @ApiResponse({ status: 200, description: 'Users listed successfully.' })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  listUsers(@Query() query: AdminListQueryDto) {
    return this.adminService.listUsers(query);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @AdminOnly()
  @Get('users/:id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully.' })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  getUser(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.getUser(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @AdminOnly()
  @Patch('users/:id/suspend')
  @ApiOperation({ summary: 'Suspend a user account' })
  @ApiResponse({ status: 200, description: 'User suspended successfully.' })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  suspendUser(@Param('id', ParseIntPipe) id: number, @Body() dto: SuspendUserDto) {
    return this.adminService.suspendUser(id, dto.reason);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @AdminOnly()
  @Patch('users/:id/activate')
  @ApiOperation({ summary: 'Activate a user account' })
  @ApiResponse({ status: 200, description: 'User activated successfully.' })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  activateUser(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.activateUser(id);
  }

  // ─── KYC / Documents ─────────────────────────────────────────────────────────
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @AdminOnly()
  @Get('documents/pending')
  @ApiOperation({ summary: 'List pending KYC documents' })
  @ApiResponse({ status: 200, description: 'Pending documents listed successfully.' })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  listPendingDocuments() {
    return this.adminService.listPendingDocuments();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @AdminOnly()
  @Patch('documents/:id/approve')
  @ApiOperation({ summary: 'Approve a KYC document' })
  @ApiResponse({ status: 200, description: 'Document approved successfully.' })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  approveDocument(@Param('id', ParseIntPipe) id: number, @AuthUser() user: any) {
    return this.adminService.approveDocument(id, user.email);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @AdminOnly()
  @Patch('documents/:id/reject')
  @ApiOperation({ summary: 'Reject a KYC document' })
  @ApiResponse({ status: 200, description: 'Document rejected successfully.' })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  rejectDocument(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RejectDocumentDto,
    @AuthUser() user: any,
  ) {
    return this.adminService.rejectDocument(id, dto.reason, user.email);
  }

  // ─── Trips ───────────────────────────────────────────────────────────────────

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @AdminOnly()
  @Get('trips')
  @ApiOperation({ summary: 'List all trips' })
  @ApiResponse({ status: 200, description: 'Trips listed successfully.' })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  listTrips(@Query() query: AdminListQueryDto) {
    return this.adminService.listTrips(query);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @AdminOnly()
  @Get('trips/:id')
  @ApiOperation({ summary: 'Get trip detail' })
  @ApiResponse({ status: 200, description: 'Trip detail retrieved successfully.' })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  getTrip(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.getTrip(id);
  }

  // ─── Bookings ────────────────────────────────────────────────────────────────

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @AdminOnly()
  @Get('bookings')
  @ApiOperation({ summary: 'List all bookings' })
  @ApiResponse({ status: 200, description: 'Bookings listed successfully.' })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  listBookings(@Query() query: AdminListQueryDto) {
    return this.adminService.listBookings(query);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @AdminOnly()
  @Patch('bookings/:id/refund')
  @ApiOperation({ summary: 'Issue a refund for a booking' })
  @ApiResponse({ status: 200, description: 'Refund issued successfully.' })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  refundBooking(@Param('id', ParseIntPipe) id: number, @AuthUser() user: any) {
    return this.adminService.refundBooking(id, user.email);
  }

  // ─── Payouts ─────────────────────────────────────────────────────────────────
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @AdminOnly()
  @Get('payouts')
  @ApiOperation({ summary: 'List all payout requests' })
  @ApiResponse({ status: 200, description: 'Payout requests listed successfully.' })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  listPayouts(@Query() query: AdminListQueryDto) {
    return this.adminService.listPayouts(query);
  }
  
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @AdminOnly()
  @Patch('payouts/:id/approve')
  @ApiOperation({ summary: 'Approve and execute a payout via Paystack' })
  @ApiResponse({ status: 200, description: 'Payout approved and executed successfully.' })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  approvePayout(@Param('id', ParseIntPipe) id: number, @AuthUser() user: any) {
    return this.adminService.approvePayout(id, user.email);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @AdminOnly()
  @Patch('payouts/:id/decline')
  @ApiOperation({ summary: 'Decline a payout request' })
  @ApiResponse({ status: 200, description: 'Payout declined successfully.' })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  declinePayout(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DeclinePayoutDto,
    @AuthUser() user: any,
  ) {
    return this.adminService.declinePayout(id, dto.reason, user.email);
  }

  // ─── Coupons ─────────────────────────────────────────────────────────────────
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @AdminOnly()
  @Get('coupons')
  @ApiOperation({ summary: 'List all coupons' })
  @ApiResponse({ status: 200, description: 'Coupons listed successfully.' })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  listCoupons(@Query() query: AdminListQueryDto) {
    return this.adminService.listCoupons(query);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @AdminOnly()
  @Post('coupons')
  @ApiOperation({ summary: 'Create a new coupon' })
  @ApiResponse({ status: 201, description: 'Coupon created successfully.' })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  createCoupon(@Body() dto: CreateCouponDto, @AuthUser() user: any) {
    return this.adminService.createCoupon({ ...dto, adminId: user.id });
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @AdminOnly()
  @Patch('coupons/:id/deactivate')
  @ApiOperation({ summary: 'Deactivate a coupon' })
  @ApiResponse({ status: 200, description: 'Coupon deactivated successfully.' })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  deactivateCoupon(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.deactivateCoupon(id);
  }
}