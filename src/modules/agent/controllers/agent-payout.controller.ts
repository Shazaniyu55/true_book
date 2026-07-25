import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { RolesGuard } from '@shared/guards/roles.guard';
import { AgentOnly } from '@shared/decorators/roles.decorator';
import { AuthUser } from '@shared/decorators/authUser.decorator';
import { Broker } from '@broker/broker';
import { PayoutService } from '@modules/driver/services/payout.service';
import { InitiateAgentPayoutUsecase } from '../usecases/initiateagentpayout.usecase';
import {
  AgentInitiatePayoutDto,
  ResolveAccountDto,
} from '../dtos/agent-payout.dto';

@ApiTags('Agent - Payout')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('v1/agent/payout')
export class AgentPayoutController {
  constructor(
    private readonly broker: Broker,
    private readonly payoutService: PayoutService,
    private readonly initiateAgentPayoutUsecase: InitiateAgentPayoutUsecase,
  ) {}

  // POST /v1/agent/payout/initiate  →  frontend `withdrawFunds`
  @AgentOnly()
  @Post('initiate')
  @ApiOperation({ summary: 'Agent: request a withdrawal (awaits admin approval)' })
  initiate(@AuthUser() user: any, @Body() dto: AgentInitiatePayoutDto) {
    return this.broker.runUsecases([this.initiateAgentPayoutUsecase], {
      userId: user.sub,
      dto,
    });
  }

  // POST /v1/agent/payout/name-enquiry  →  frontend `resolveAccountNumber`
  @AgentOnly()
  @Post('name-enquiry')
  @ApiOperation({ summary: 'Resolve a bank account name before withdrawal' })
  resolveAccount(@Body() dto: ResolveAccountDto) {
    return this.payoutService.resolveAccount(dto.account_number, dto.bank_code);
  }

  // GET /v1/agent/payout/beneficiary  →  frontend `getBeneficiary`
  @AgentOnly()
  @Get('beneficiary')
  @ApiOperation({ summary: 'List the agent\u2019s saved payout beneficiaries' })
  getBeneficiaries(@AuthUser() user: any) {
    return this.payoutService.getBeneficiaries(user.sub);
  }
}