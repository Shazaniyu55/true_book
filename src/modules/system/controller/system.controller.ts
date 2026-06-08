// system-setting.controller.ts
import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { SystemSettingService } from '../service/system.service';
import { PriceControlDto, ReferralProgramDto } from 'src/types/enums';
import { ServiceName } from '@shared/decorators/servicename.decorators';
import { RolesGuard } from '@shared/guards/roles.guard';
import { PermissionsGuard } from '@shared/guards/permissions.guard';
import { AdminOnly } from '@shared/decorators/roles.decorator';

@ServiceName('system settings')
@ApiTags('System Settings')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('v1/admin/settings')
export class SystemSettingController {
  constructor(private readonly settingService: SystemSettingService) {}

  @AdminOnly()
  @Get('get-all')
  @ApiOperation({ summary: 'Get all system settings' })
  getAllSettings() {
    return this.settingService.getAllSettings();
  }

  @AdminOnly()
  @Patch('price-control')
  @ApiOperation({ summary: 'Update price control settings' })
  setPriceControl(@Body() dto: PriceControlDto) {
    return this.settingService.setPriceControl(dto);
  }

   @AdminOnly()
  @Get('price-control')
  @ApiOperation({ summary: 'Get price control settings' })
  getPriceControl() {
    return this.settingService.getPriceControl();
  }

   @AdminOnly()
  @Patch('referral-program')
  @ApiOperation({ summary: 'Update referral program settings' })
  
  setReferralProgram(@Body() dto: ReferralProgramDto) {
    return this.settingService.setReferralProgram(dto);
  }

  @AdminOnly()
  @Get('referral-program')
  @ApiOperation({ summary: 'Get referral program settings' })
  getReferralProgram() {
    return this.settingService.getReferralProgram();
  }
}