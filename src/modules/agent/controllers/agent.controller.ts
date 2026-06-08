import { Body, Controller, Get, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { RolesGuard } from '@shared/guards/roles.guard';
import { AgentOnly } from '@shared/decorators/roles.decorator';
import { AuthUser } from '@shared/decorators/authUser.decorator';
import { Broker } from '@broker/broker';
import { AgentService } from '../services/agent.service';
import { BookAgentTripDto, AgentWithdrawDto, UpdateAgentBankDto, AgentQueryDto } from '../dtos/agent.dto';

@ApiTags('Agent')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@AgentOnly()
@Controller('v1/agent')
export class AgentController {
  constructor(
    private readonly broker: Broker,
    private readonly agentService: AgentService,
  ) {}

  // ─── Profile ─────────────────────────────────────────────────────────────────

  // @Get('profile')
  // @ApiOperation({ summary: 'Get agent profile' })
  // getProfile(@AuthUser() user: any) {
  //   return this.agentService.getProfile(user.id);
  // }

  //@Patch('bank')
  // @ApiOperation({ summary: 'Update bank account details' })
  // updateBank(@Body() dto: UpdateAgentBankDto, @AuthUser() user: any) {
  //   return this.agentService.updateBankDetails(user.id, dto);
  // }

  // ─── Trip Booking ─────────────────────────────────────────────────────────────

  // @Post('book')
  // @ApiOperation({
  //   summary: 'Book a trip on behalf of a passenger',
  //   description:
  //     'Returns a payment link. The passenger (or agent) pays via the link. ' +
  //     'Commission is credited to the agent wallet once the trip completes. ' +
  //     'The platform holds funds in escrow until trip completion.',
  // })
  // bookTrip(@Body() dto: BookAgentTripDto, @AuthUser() user: any) {
  //   return this.broker.runUsecases(
  //     [
  //       {
  //         execute: (em: any) => this.agentService.bookTripForPassenger(user.id, dto, em),
  //       } as any,
  //     ],
  //     dto,
  //   );
  // }

  // @Get('bookings')
  // @ApiOperation({ summary: 'My booking history (trips booked for passengers)' })
  // getBookings(@Query() query: AgentQueryDto, @AuthUser() user: any) {
  //   return this.agentService.getBookingHistory(user.id, query);
  // }

  // ─── Wallet & Commission ──────────────────────────────────────────────────────

  // @Get('wallet')
  // @ApiOperation({
  //   summary: 'Wallet balance and commission summary',
  //   description:
  //     'Shows available balance, total lifetime commission, pending (unreleased) commission, ' +
  //     'and total passengers referred.',
  // })
  // getWallet(@AuthUser() user: any) {
  //   return this.agentService.getWallet(user.id);
  // }

  // @Get('commissions')
  // @ApiOperation({ summary: 'Commission history with status filter' })
  // getCommissions(@Query() query: AgentQueryDto, @AuthUser() user: any) {
  //   return this.agentService.getCommissions(user.id, query);
  // }

  // @Post('withdraw')
  // @ApiOperation({
  //   summary: 'Request a withdrawal from wallet balance',
  //   description:
  //     'Creates a pending payout request. An admin approves and executes the Paystack transfer.',
  // })
  // requestWithdrawal(@Body() dto: AgentWithdrawDto, @AuthUser() user: any) {
  //   return this.agentService.requestWithdrawal(user.id, dto);
  // }
}
