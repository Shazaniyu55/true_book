import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { RolesGuard } from '@shared/guards/roles.guard';
import { AdminOnly } from '@shared/decorators/roles.decorator';
import { ServiceName } from '@shared/decorators/servicename.decorators';
import { LocationService } from '../service/location.service';

@ApiTags('Admin - Tracking')
@ApiBearerAuth()
@ServiceName('tracking')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('v1/admin/trips')
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  @AdminOnly()
  @Get(':id/location')
  @ApiOperation({ summary: 'Last-known position of a trip' })
  getCurrent(@Param('id', ParseUUIDPipe) id: string) {
    return this.locationService.getCurrentLocation(id);
  }

  @AdminOnly()
  @Get(':id/track')
  @ApiOperation({ summary: 'Full GPS history of a trip (route replay)' })
  getTrack(@Param('id', ParseUUIDPipe) id: string) {
    return this.locationService.getTripTrack(id);
  }
}