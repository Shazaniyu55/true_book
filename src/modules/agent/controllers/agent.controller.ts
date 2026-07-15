import { Body, Controller, Get, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { RolesGuard } from '@shared/guards/roles.guard';
import { AgentOnly } from '@shared/decorators/roles.decorator';
import { AuthUser } from '@shared/decorators/authUser.decorator';
import { Broker } from '@broker/broker';
import { GetAgentDashboardUsecase } from '../usecases/getAgentDashboard.usecase';
import { ReferDriverUsecase } from '../usecases/referedriver.usecase';
import { AgentQueryDto, AgentRefer } from '../dtos/agent.dto';
import { GetDriverReferedUsecase } from '../usecases/getDriverrefered.usecase';
import { EarnFromDriverUsecase } from '../usecases/earn.usecase';


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
    private readonly earnFromDriverUsecase:EarnFromDriverUsecase

  ) {}

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
