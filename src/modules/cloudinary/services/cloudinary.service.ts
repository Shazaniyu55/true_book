import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  PayloadTooLargeException,
} from '@nestjs/common';
import { v2 as cloudinary, UploadApiErrorResponse, UploadApiResponse } from 'cloudinary';
import * as streamifier from 'streamifier';
import {
  CLOUDINARY,
  CLOUDINARY_MAX_DOC_SIZE,
  CLOUDINARY_MAX_IMAGE_SIZE,
  CLOUDINARY_MAX_VIDEO_SIZE,
} from '../cloudinary.constants';
import {
  CloudinaryDeleteResult,
  CloudinaryUploadOptions,
  CloudinaryUploadResult,
} from '@shared/interface/upload.interface';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor(
    @Inject(CLOUDINARY) private readonly cloudinaryClient: typeof cloudinary,
  ) {}

  async upload(
    file: Express.Multer.File,
    options: CloudinaryUploadOptions = {},
  ): Promise<CloudinaryUploadResult> {
    if (!file) throw new BadRequestException('No file provided');
    this.validateFileSize(file, options.resource_type);

    return new Promise((resolve, reject) => {
      const uploadOptions: Record<string, any> = {
        resource_type: options.resource_type ?? 'auto',
        use_filename: options.use_filename ?? true,
        unique_filename: options.unique_filename ?? true,
        overwrite: options.overwrite ?? false,
        ...options,
      };

      const stream = this.cloudinaryClient.uploader.upload_stream(
        uploadOptions,
        (error: UploadApiErrorResponse, result: UploadApiResponse) => {
          if (error) {
            this.logger.error('Cloudinary upload error', error);
            return reject(new BadRequestException(error.message));
          }
          resolve({
            public_id: result.public_id,
            url: result.url,
            secure_url: result.secure_url,
            format: result.format,
            resource_type: result.resource_type,
            bytes: result.bytes,
            width: result.width,
            height: result.height,
            created_at: result.created_at,
            original_filename: result.original_filename,
            duration: result.duration,
          });
        },
      );

      streamifier.createReadStream(file.buffer).pipe(stream);
    });
  }

  async uploadMultiple(
    files: Express.Multer.File[],
    options: CloudinaryUploadOptions = {},
  ): Promise<CloudinaryUploadResult[]> {
    if (!files?.length) throw new BadRequestException('No files provided');
    return Promise.all(files.map((file) => this.upload(file, options)));
  }

  async delete(publicId: string): Promise<CloudinaryDeleteResult> {
    const result = await this.cloudinaryClient.uploader.destroy(publicId);
    return { result: result.result, public_id: publicId };
  }

  async deleteMultiple(publicIds: string[]): Promise<Record<string, string>> {
    const result = await this.cloudinaryClient.api.delete_resources(publicIds);
    return result.deleted;
  }

  getTransformedUrl(
    publicId: string,
    transformations: Array<Record<string, any>>,
  ): string {
    return this.cloudinaryClient.url(publicId, {
      transformation: transformations,
      secure: true,
    });
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private validateFileSize(
    file: Express.Multer.File,
    resourceType?: string,
  ): void {
    const type = resourceType ?? this.detectResourceType(file.mimetype);
    const limits: Record<string, number> = {
      image: CLOUDINARY_MAX_IMAGE_SIZE,
      video: CLOUDINARY_MAX_VIDEO_SIZE,
      raw: CLOUDINARY_MAX_DOC_SIZE,
    };
    const limit = limits[type] ?? CLOUDINARY_MAX_IMAGE_SIZE;
    if (file.size > limit) {
      throw new PayloadTooLargeException(
        `File too large. Max size: ${limit / (1024 * 1024)} MB`,
      );
    }
  }

  private detectResourceType(mimetype: string): string {
    if (mimetype.startsWith('image/')) return 'image';
    if (mimetype.startsWith('video/')) return 'video';
    return 'raw';
  }
}