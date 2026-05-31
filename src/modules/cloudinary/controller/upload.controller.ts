import { Controller, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';

import { FileInterceptor } from '@nestjs/platform-express';

import { CloudinaryService } from '../services/cloudinary.service';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { RolesGuard } from '@shared/guards/roles.guard';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('upload')
export class UploadController {
  constructor(private readonly cloudinaryService: CloudinaryService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    const result = await this.cloudinaryService.upload(file);

    return {
      message: 'Upload successful',
      data: result,
    };
  }
}
