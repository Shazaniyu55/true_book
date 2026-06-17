import { BadRequestException, Body, Controller, Get, Post, UploadedFile, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiConsumes, ApiBody } from '@nestjs/swagger';

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
import { FileFieldsInterceptor, FileInterceptor } from '@nestjs/platform-express';
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


@Post('license')
@UseInterceptors(FileFieldsInterceptor([
  { name: 'driversLicense', maxCount: 1 },
  { name: 'regDocs', maxCount: 1 },
]))
@ApiConsumes('multipart/form-data')
@ApiBody({
  schema: {
    type: 'object',
    properties: {
      driversLicense: { type: 'string', format: 'binary' },
      regDocs: { type: 'string', format: 'binary' },
      licenseNumber: { type: 'string' },
    },
    required: ['frontImage'],
  },
})
verifyDriverLicense(
  @AuthUser() user: any,
  @UploadedFiles() files: { driversLicense?: Express.Multer.File[]; regDocs?: Express.Multer.File[] },
  @Body() dto: VerifyDriverLicenseDto,
) {
  return this.kycService.verifyDriverLicense(user.id, files, dto);
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