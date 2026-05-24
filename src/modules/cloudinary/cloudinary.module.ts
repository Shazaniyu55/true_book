import { Module } from '@nestjs/common';
import { CloudinaryProvider } from '../cloudinary/provider/cloudinary.provider';
import { CloudinaryService } from '../cloudinary/services/cloudinary.service';

@Module({
  providers: [CloudinaryProvider, CloudinaryService],
  exports: [CloudinaryService],
})
export class CloudinaryModule {}