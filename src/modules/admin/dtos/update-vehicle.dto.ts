import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class AdminUpdateVehicleDto {
  @ApiProperty({ description: 'Vehicle UUID (vehicles.id) to update' })
  @IsUUID()
  @IsNotEmpty()
  vehicle_id: string;

  @ApiPropertyOptional({ description: 'Vehicle type UUID, from GET /admin/vehicle-types' })
  @IsOptional() @IsUUID()
  vehicle_type_id?: string;

  @ApiPropertyOptional({ example: 'Toyota Camry' })
  @IsOptional() @IsString()
  model?: string;

  @ApiPropertyOptional({ example: 'Toyota' })
  @IsOptional() @IsString()
  make?: string;

  @ApiPropertyOptional({ example: '2020' })
  @IsOptional() @IsString()
  year?: string;

  @ApiPropertyOptional({ example: 'ABC-1234' })
  @IsOptional() @IsString()
  license_plate_number?: string;

  @ApiPropertyOptional({ example: '4', description: 'Seat count, sent as a string by the multipart form' })
  @IsOptional() @IsNumberString()
  capacity?: string;

  @ApiPropertyOptional({ example: 'Black' })
  @IsOptional() @IsString()
  color?: string;

  @ApiPropertyOptional({ example: 'AXA - policy 12345' })
  @IsOptional() @IsString()
  insurance?: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['ac', 'wifi', 'usb'],
    description: 'Sent as features[0], features[1], ... form fields',
  })
  @IsOptional()
  features?: string[];
}