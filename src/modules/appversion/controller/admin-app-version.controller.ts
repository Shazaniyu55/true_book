import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { RolesGuard } from '@shared/guards/roles.guard';
import { AdminOnly } from '@shared/decorators/roles.decorator';
import { AuthUser } from '@shared/decorators/authUser.decorator';
import { ServiceName } from '@shared/decorators/servicename.decorators';
import { AppVersionService } from '../service/app-version.service';
import { UpdateAppVersionDto, VersionHistoryQueryDto } from '../dto/app-version.dto';

@ApiTags('Admin - App Versions')
@ApiBearerAuth()
@ServiceName('app-version')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('v1/admin')
export class AdminAppVersionController {
  constructor(private readonly service: AppVersionService) {}

  @AdminOnly()
  @Get('app-versions')
  @ApiOperation({ summary: 'Get current app version settings' })
  getSettings() {
    return this.service.getCurrentSettings();
  }

  @AdminOnly()
  @Post('app-versions/update')
  @ApiOperation({ summary: 'Create/update an app version record' })
  updateSettings(@Body() dto: UpdateAppVersionDto, @AuthUser() user: any) {
    return this.service.updateSettings(dto, user.email);
  }

  @AdminOnly()
  @Get('history')
  @ApiOperation({ summary: 'Paginated app version history' })
  getHistory(@Query() query: VersionHistoryQueryDto) {
    return this.service.getHistory(query);
  }
}