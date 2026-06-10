import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Public } from '@shared/decorators/isPublic.decorator';
import { SkipKillSwitch } from '@modules/kill-switch/kill-switch.guard';
import { ServiceName } from '@shared/decorators/servicename.decorators';
import { AppVersionService } from '../service/app-version.service';

@ApiTags('Passenger - App Version')
@ServiceName('app-version')
@Controller('v1/passenger/app-version')
export class PassengerAppVersionController {
  constructor(private readonly service: AppVersionService) {}

  @Public()
  @SkipKillSwitch()
  @Get()
  @ApiOperation({ summary: 'Check passenger app version (public)' })
  @ApiQuery({ name: 'platform', required: false, enum: ['android', 'ios'] })
  checkVersion(@Query('platform') platform = 'android') {
    return this.service.checkVersion('passenger', platform, '1.3.4');
  }
}