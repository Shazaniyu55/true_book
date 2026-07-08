import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { Public } from '@shared/decorators/isPublic.decorator';
import { SkipKillSwitch } from '../kill-switch/kill-switch.guard';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  // @Public()        → bypasses the global JwtAuthGuard
  // @SkipKillSwitch() → stays reachable even when the kill switch is on,
  //                     so the keep-alive ping never fails with 401/503
  @Public()
  @SkipKillSwitch()
  @Get()
  check() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}