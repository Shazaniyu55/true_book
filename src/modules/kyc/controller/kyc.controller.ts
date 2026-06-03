import { BadRequestException, Body, Controller, Get, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiConsumes } from '@nestjs/swagger';

import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { RolesGuard } from '@shared/guards/roles.guard';
import { DriverOnly } from '@shared/decorators/roles.decorator';
import { AuthUser } from '@shared/decorators/authUser.decorator';
import { ServiceName } from '@shared/decorators/servicename.decorators';

import { KycService } from '../service/kyc.service';
import {
  UploadDocumentDto,
  VerifyDriverBvnDto,
  VerifyDriverLicenseDto,
  VerifyDriverNinDto,
} from '../dtos/kyc.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { Broker } from '@broker/broker';
import { GetDriverKycStatusUsecase } from '../usecase/getDriverKycStatus.usecase';
import { VerifyDriverLicenseUsecase } from '../usecase/verifydriverlicense.usecase';
import { VerifyDriverNinUsecase } from '../usecase/verifyDriverNin.usecase';
import { VerifyDriverBvnUsecase } from '../usecase/verifyDriverBvn.usecase';

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
    private readonly verifyDriverLicensUsecase:VerifyDriverLicenseUsecase,
    // private readonly verifyDriverNinUsecase:VerifyDriverNinUsecase,
    // private readonly verifyDriverBvnUsecase: VerifyDriverBvnUsecase
  
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
  @ApiOperation({
    summary: "Verify driver's license via Dojah",
    description: 'Requires BVN or NIN to be verified first.',
  })
  verifyLicense(@AuthUser() user: any, @Body() dto: VerifyDriverLicenseDto) {
    return this.broker.runUsecases([this.verifyDriverLicensUsecase], {id: user.sub, dto: dto})
  }

  @DriverOnly()
  @Post('documents')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a KYC document for admin review' })
  uploadDocument(
    @AuthUser() user: any,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadDocumentDto,
  ) {
    if (!file) throw new BadRequestException('Document file is required');
    return this.kycService.uploadDriverDocument(user.id, dto, file);
  }
}