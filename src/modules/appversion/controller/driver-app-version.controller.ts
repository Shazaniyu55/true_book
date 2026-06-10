import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Public } from '@shared/decorators/isPublic.decorator';
import { SkipKillSwitch } from '@modules/kill-switch/kill-switch.guard';
import { ServiceName } from '@shared/decorators/servicename.decorators';
import { AppVersionService } from '../service/app-version.service';

@ApiTags('Driver - App Version')
@ServiceName('app-version')
@Controller('v1/drivers/app-version')
export class DriverAppVersionController {
  constructor(private readonly service: AppVersionService) {}

  @Public()
  @SkipKillSwitch()
  @Get()
  @ApiOperation({ summary: 'Check driver app version (public)' })
  @ApiQuery({ name: 'platform', required: false, enum: ['android', 'ios'] })
  checkVersion(@Query('platform') platform = 'android') {
    return this.service.checkVersion('driver', platform, '1.0.0');
  }
}