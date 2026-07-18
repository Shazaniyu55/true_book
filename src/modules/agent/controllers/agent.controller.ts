import { Body, Controller, Get, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { RolesGuard } from '@shared/guards/roles.guard';
import { AgentOnly } from '@shared/decorators/roles.decorator';
import { AuthUser } from '@shared/decorators/authUser.decorator';
import { Broker } from '@broker/broker';
import { GetAgentDashboardUsecase } from '../usecases/getAgentDashboard.usecase';
import { ReferDriverUsecase } from '../usecases/referedriver.usecase';
import {
  AgentQueryDto,
  AgentRefer,
  AgentUpdatePasswordDto,
  CreateTransactionPinDto,
  UpdateAgentProfileDto,
} from '../dtos/agent.dto';
import { GetDriverReferedUsecase } from '../usecases/getDriverrefered.usecase';
import { EarnFromDriverUsecase } from '../usecases/earn.usecase';
import { GetAgentProfileUsecase } from '../usecases/getagentprofile.usecase';
import { UpdateAgentProfileUsecase } from '../usecases/updateagentprofile.usecase';
import { CreateTransactionPinUsecase } from '../usecases/createtransaction.usecase';
import { UpdateAgentPasswordUsecase } from '../usecases/updateagentpassword.usecase';


@ApiTags('Agent')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('v1/agent')
export class AgentController {
  constructor(
    private readonly broker: Broker,
    private readonly getAgentDashBoardUsecase:GetAgentDashboardUsecase,
    private readonly referDriverUsecase:ReferDriverUsecase,
    private readonly getDriverReferedUsecase:GetDriverReferedUsecase,
    private readonly earnFromDriverUsecase:EarnFromDriverUsecase,
    private readonly getAgentProfileUsecase:GetAgentProfileUsecase,
    private readonly updateAgentProfileUsecase:UpdateAgentProfileUsecase,
    private readonly createTransactionPinUsecase:CreateTransactionPinUsecase,
    private readonly updateAgentPasswordUsecase:UpdateAgentPasswordUsecase

  ) {}

  // ─── Profile ───────────────────────────────────────────────────────────────

  @AgentOnly()
  @Get('me')
  @ApiOperation({ summary: 'Get current agent profile' })
  getCurrentAgent(@AuthUser() user: any) {
    return this.broker.runUsecases([this.getAgentProfileUsecase], { userId: user.sub })
  }

  @AgentOnly()
  @Post('update')
  @ApiOperation({ summary: 'Update agent profile' })
  updateProfile(@AuthUser() user: any, @Body() dto: UpdateAgentProfileDto) {
    return this.broker.runUsecases([this.updateAgentProfileUsecase], { userId: user.sub, dto: dto })
  }

  @AgentOnly()
  @Post('transaction-pin/create')
  @ApiOperation({ summary: 'Create agent transaction pin' })
  createTransactionPin(@AuthUser() user: any, @Body() dto: CreateTransactionPinDto) {
    return this.broker.runUsecases([this.createTransactionPinUsecase], { userId: user.sub, dto: dto })
  }

  @AgentOnly()
  @Post('password-update')
  @ApiOperation({ summary: 'Update agent password' })
  updatePassword(@AuthUser() user: any, @Body() dto: AgentUpdatePasswordDto) {
    return this.broker.runUsecases([this.updateAgentPasswordUsecase], { userId: user.sub, dto: dto })
  }

  // ─── Referrals (frontend-friendly aliases) ─────────────────────────────────

  @AgentOnly()
  @Get('referrals')
  @ApiOperation({ summary: 'Get agent referrals list' })
  getReferrals(@AuthUser() user: any, @Query() dto: AgentQueryDto) {
    return this.broker.runUsecases([this.getDriverReferedUsecase], { agentId: user.sub, dto: dto })
  }

  @AgentOnly()
  @Get('referrals/dashboard')
  @ApiOperation({ summary: 'Get agent referral dashboard stats' })
  getReferralsDashboard(@AuthUser() user: any) {
    return this.broker.runUsecases([this.getAgentDashBoardUsecase], { id: user.sub })
  }

  @AgentOnly()
  @Post('referrals')
  @ApiOperation({ summary: 'Create a referral (agent refers driver)' })
  createReferral(@AuthUser() user: any, @Body() dto: AgentRefer) {
    return this.broker.runUsecases([this.referDriverUsecase], { agentId: user.sub, driverId: dto.driverId, referralCode: dto.referralCode })
  }

  // ─── DashBoard ─────────────────────────────────────────────────────────────────

  @AgentOnly()
  @Get('dashboard')
  @ApiOperation({ summary: 'Get agent dashboard' })
  getDashboard(@AuthUser() user: any) {
    return this.broker.runUsecases([this.getAgentDashBoardUsecase], { id: user.sub })
  }


  @AgentOnly()
  @Post('refer')
  @ApiOperation({ summary: ' agent refer driver' })
  referDriver(@AuthUser() user: any, @Body() dto: AgentRefer) {
    return this.broker.runUsecases([this.referDriverUsecase], { agentId: user.sub, driverId:dto.driverId, referralCode:dto.referralCode })
  }


  @AgentOnly()
  @Get('driver-refer')
  @ApiOperation({ summary: ' agent get refer drivers' })
  getDriverRefer(@AuthUser() user: any, @Query() dto: AgentQueryDto) {
    return this.broker.runUsecases([this.getDriverReferedUsecase], { agentId: user.sub, dto:dto})
  }

  @AgentOnly()
  @Post('earn')
  @ApiOperation({ summary: ' agent get refer drivers' })
  earnDriver(@AuthUser() user: any, @Body() tripId: string) {
    return this.broker.runUsecases([this.earnFromDriverUsecase], {  tripId:tripId})
  }


  
}

// import { Body, Controller, Get, Patch, Post, Query, UseGuards } from '@nestjs/common';
// import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
// import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
// import { RolesGuard } from '@shared/guards/roles.guard';
// import { AgentOnly } from '@shared/decorators/roles.decorator';
// import { AuthUser } from '@shared/decorators/authUser.decorator';
// import { Broker } from '@broker/broker';
// import { GetAgentDashboardUsecase } from '../usecases/getAgentDashboard.usecase';
// import { ReferDriverUsecase } from '../usecases/referedriver.usecase';
// import { AgentQueryDto, AgentRefer } from '../dtos/agent.dto';
// import { GetDriverReferedUsecase } from '../usecases/getDriverrefered.usecase';
// import { EarnFromDriverUsecase } from '../usecases/earn.usecase';


// @ApiTags('Agent')
// @ApiBearerAuth()
// @UseGuards(JwtAuthGuard, RolesGuard)
// @Controller('v1/agent')
// export class AgentController {
//   constructor(
//     private readonly broker: Broker,
//     private readonly getAgentDashBoardUsecase:GetAgentDashboardUsecase,
//     private readonly referDriverUsecase:ReferDriverUsecase,
//     private readonly getDriverReferedUsecase:GetDriverReferedUsecase,
//     private readonly earnFromDriverUsecase:EarnFromDriverUsecase

//   ) {}

//   // ─── DashBoard ─────────────────────────────────────────────────────────────────

//   @AgentOnly()
//   @Get('dashboard')
//   @ApiOperation({ summary: 'Get agent dashboard' })
//   getDashboard(@AuthUser() user: any) {
//     return this.broker.runUsecases([this.getAgentDashBoardUsecase], { id: user.sub })
//   }


//   @AgentOnly()
//   @Post('refer')
//   @ApiOperation({ summary: ' agent refer driver' })
//   referDriver(@AuthUser() user: any, @Body() dto: AgentRefer) {
//     return this.broker.runUsecases([this.referDriverUsecase], { agentId: user.sub, driverId:dto.driverId, referralCode:dto.referralCode })
//   }


//   @AgentOnly()
//   @Get('driver-refer')
//   @ApiOperation({ summary: ' agent get refer drivers' })
//   getDriverRefer(@AuthUser() user: any, @Query() dto: AgentQueryDto) {
//     return this.broker.runUsecases([this.getDriverReferedUsecase], { agentId: user.sub, dto:dto})
//   }

//   @AgentOnly()
//   @Post('earn')
//   @ApiOperation({ summary: ' agent get refer drivers' })
//   earnDriver(@AuthUser() user: any, @Body() tripId: string) {
//     return this.broker.runUsecases([this.earnFromDriverUsecase], {  tripId:tripId})
//   }


  
// }
