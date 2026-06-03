import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
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

  @ApiPropertyOptional({ description: 'Vehicle photo URL (after Cloudinary upload)' })
  @IsOptional() @IsString() vehiclePhoto?: string;
}