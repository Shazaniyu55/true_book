import { Body, Controller, Get, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { RolesGuard } from '@shared/guards/roles.guard';
import { AgentOnly } from '@shared/decorators/roles.decorator';
import { AuthUser } from '@shared/decorators/authUser.decorator';
import { Broker } from '@broker/broker';
import { GetAgentDashboardUsecase } from '../usecases/getAgentDashboard.usecase';
import { ReferDriverUsecase } from '../usecases/referedriver.usecase';


@ApiTags('Agent')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('v1/agent')
export class AgentController {
  constructor(
    private readonly broker: Broker,
    private readonly getAgentDashBoardUsecase:GetAgentDashboardUsecase,
    private readonly referDriverUsecase:ReferDriverUsecase

  ) {}

  // ─── DashBoard ─────────────────────────────────────────────────────────────────

  @AgentOnly()
  @Get('dashboard')
  @ApiOperation({ summary: 'Get agent dashboard' })
  getDashboard(@AuthUser() user: any) {
    return this.broker.runUsecases([this.getAgentDashBoardUsecase], { id: user.sub })
  }


  @AgentOnly()
  @Get('refer')
  @ApiOperation({ summary: ' agent refer driver' })
  referDriver(@AuthUser() user: any) {
    return this.broker.runUsecases([this.referDriverUsecase], { agentId: user.sub })
  }





  
}
