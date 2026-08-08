import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumberString, IsString, IsUUID } from 'class-validator';

export class AdminAddVehicleDto {
  @ApiProperty({ description: 'Driver UUID (drivers.id) this vehicle belongs to' })
  @IsUUID()
  @IsNotEmpty()
  driver_id: string;

  @ApiProperty({ description: 'Vehicle type UUID, from GET /admin/vehicle-types' })
  @IsUUID()
  @IsNotEmpty()
  vehicle_type_id: string;

  @ApiProperty({ example: 'Toyota Camry' })
  @IsString()
  @IsNotEmpty()
  model: string;

  @ApiProperty({ example: 'ABC-1234' })
  @IsString()
  @IsNotEmpty()
  license_plate_number: string;

  @ApiProperty({ example: '4', description: 'Seat count, sent as a string by the multipart form' })
  @IsNumberString()
  @IsNotEmpty()
  capacity: string;

  @ApiProperty({ example: 'Black' })
  @IsString()
  @IsNotEmpty()
  color: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['ac', 'wifi', 'usb'],
    description: 'Sent as features[0], features[1], ... form fields',
  })
  features?: string[];
}