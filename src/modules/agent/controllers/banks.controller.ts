import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { PayoutService } from '@modules/driver/services/payout.service';

/**
 * Top-level bank list — matches the frontend `getBankCodes` → GET /banks.
 * Any authenticated user (agent, driver, passenger) may fetch it, so it is
 * intentionally NOT restricted with @AgentOnly(). The list is cached for a
 * day inside PayoutService.getBankList().
 */
@ApiTags('Banks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('v1/banks')
export class BanksController {
  constructor(private readonly payoutService: PayoutService) {}

  // GET /v1/banks
  @Get()
  @ApiOperation({ summary: 'Fetch supported bank list (name, code, slug)' })
  getBanks() {
    return this.payoutService.getBankList();
  }
}