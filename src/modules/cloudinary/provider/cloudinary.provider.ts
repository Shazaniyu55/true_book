import { v2 as cloudinary } from 'cloudinary';
import { ConfigService } from '@nestjs/config';
import { CLOUDINARY } from '../cloudinary.constants';

export const CloudinaryProvider = {
  provide: CLOUDINARY,
  inject: [ConfigService],
  useFactory: (configService: ConfigService): typeof cloudinary => {
    cloudinary.config({
      cloud_name: configService.get<string>('common.cloudinary.cloudName'),
      api_key: configService.get<string>('common.cloudinary.apiKey'),
      api_secret: configService.get<string>('common.cloudinary.apiSecret'),
      secure: true,
    });
    return cloudinary;
  },
};