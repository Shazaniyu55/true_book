import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class CreateVehicleDto {
  

  @ApiProperty({ example: "bus" })
  @IsString() type: string;

  @ApiProperty({ example: 'Toyota' })
  @IsOptional() @IsString() make: string;

  @ApiProperty({ example: 'Hiace' })
  @IsOptional() @IsString() model: string;

  @ApiProperty({ example: '2019' })
  @IsOptional() @IsString() year: string;

  @ApiProperty({ example: 'ABC-123-XY' })
  @IsOptional() @IsString() plateNumber: string;

  @ApiProperty({ example: 'White' })
  @IsOptional() @IsString() color: string;

  @ApiProperty({ example: 14 })
  @Type(() => Number) @IsInt() @Min(1) @Max(50) capacity: number;



  @ApiPropertyOptional({
    description: 'Vehicle photo URLs (after Cloudinary upload)',
    example: ['https://res.cloudinary.com/your-cloud/image/upload/v1/photo1.jpg'],
    type: [String],
  })

  @IsOptional()
  @IsArray()
  @IsOptional({ each: true })
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



export class UpdateVehicleDto {
  

  @ApiProperty({ example: "bus" })
  @IsString() type: string;

  @ApiProperty({ example: 'Toyota' })
  @IsOptional() @IsString() make: string;

  @ApiProperty({ example: 'Hiace' })
  @IsOptional() @IsString() model: string;

  @ApiProperty({ example: '2019' })
  @IsOptional() @IsString() year: string;

  @ApiProperty({ example: 'ABC-123-XY' })
  @IsOptional() @IsString() plateNumber: string;

  @ApiProperty({ example: 'White' })
  @IsOptional() @IsString() color: string;

  @ApiProperty({ example: 14 })
  @Type(() => Number) @IsInt() @Min(1) @Max(50) capacity: number;



  @ApiPropertyOptional({
    description: 'Vehicle photo URLs (after Cloudinary upload)',
    example: ['https://res.cloudinary.com/your-cloud/image/upload/v1/photo1.jpg'],
    type: [String],
  })

  @IsOptional()
  @IsArray()
  @IsOptional({ each: true })
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