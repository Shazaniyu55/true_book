import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { RolesGuard } from '@shared/guards/roles.guard';
import { DriverOnly } from '@shared/decorators/roles.decorator';
import { AuthUser } from '@shared/decorators/authUser.decorator';
import { ServiceName } from '@shared/decorators/servicename.decorators';

import { KycService } from '../service/kyc.service';
import {
  UploadDocumentDto,
  VerifyDriverLicenseDto,
} from '../dtos/kyc.dto';
import { Broker } from '@broker/broker';
import { GetDriverKycStatusUsecase } from '../usecase/getDriverKycStatus.usecase';


@ApiTags('Driver - KYC')
@ApiBearerAuth()
@ServiceName('kyc') // For kill switch targeting
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('v1/drivers/kyc')
export class KycController {
  constructor(
    private readonly broker: Broker,
    private readonly kycService: KycService,
    private readonly getDriverKycStatusUsecase:GetDriverKycStatusUsecase,

  
  ) {}


  @DriverOnly()
  @Get('status')
  @ApiOperation({
    summary: 'Get driver KYC status',
    description: 'Returns BVN/NIN/license verification flags, documents, and completion %.',
  })
  getStatus(@AuthUser() user: any) {
    return this.broker.runUsecases([this.getDriverKycStatusUsecase], {id: user.sub})
  }

@DriverOnly()
@Post('license')
verifyDriverLicense(
  @AuthUser() user: any,
  @Body() dto: VerifyDriverLicenseDto,
) {
  return this.kycService.verifyDriverLicense(user.id, dto);
}

  @DriverOnly()
  @Post('documents')
  uploadDocument(
    @AuthUser() user: any,
    @Body() dto: UploadDocumentDto,
  ) {
    return this.kycService.uploadDriverDocument(user.id, dto);
  }
}