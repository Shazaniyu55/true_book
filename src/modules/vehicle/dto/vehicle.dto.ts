import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { VehicleType } from 'src/types/enums';

export class CreateVehicleDto {
  @ApiProperty({ enum: VehicleType, example: VehicleType.HIACE })
  @IsEnum(VehicleType) type: VehicleType;

  @ApiProperty({ example: 'Toyota' })
  @IsNotEmpty() @IsString() make: string;

  @ApiProperty({ example: 'Hiace' })
  @IsNotEmpty() @IsString() model: string;

  @ApiProperty({ example: '2019' })
  @IsNotEmpty() @IsString() year: string;

  @ApiProperty({ example: 'ABC-123-XY' })
  @IsNotEmpty() @IsString() plateNumber: string;

  @ApiProperty({ example: 'White' })
  @IsNotEmpty() @IsString() color: string;

  @ApiProperty({ example: 14 })
  @Type(() => Number) @IsInt() @Min(1) @Max(50) capacity: number;

  // @ApiPropertyOptional({ description: 'Vehicle photo URL (after Cloudinary upload)' })
  // @IsOptional() @IsString() vehiclePhoto?: string;

    @ApiPropertyOptional({
    description: 'Vehicle photo URLs (after Cloudinary upload)',
    example: ['https://res.cloudinary.com/your-cloud/image/upload/v1/photo1.jpg'],
    type: [String],
  })

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  vehiclePhoto?: string[];

    @ApiPropertyOptional({
    description: 'Vehicle features',
    example: ['ac', 'wifi', 'usb'],
    type: [String],
  })
  
@ApiPropertyOptional({ type: [String], example: ['ac', 'wifi', 'usb'] })
@IsOptional()
@IsArray()
@IsString({ each: true })
@Transform(({ value }) => (Array.isArray(value) ? value : [value]))
features?: string[];

  @ApiPropertyOptional({
    description: 'Insurance document URL (after Cloudinary upload)',
    example: 'https://res.cloudinary.com/your-cloud/image/upload/v1/insurance.jpg',
  })
  @IsOptional()
  @IsString()
  insurance?: string;

  @ApiPropertyOptional({
    description: 'Registration document URL (after Cloudinary upload)',
    example: 'https://res.cloudinary.com/your-cloud/image/upload/v1/reg_doc.jpg',
  })
  @IsOptional()
  @IsString()
  registrationDoc?: string;
}