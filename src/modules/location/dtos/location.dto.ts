import { IsLatitude, IsLongitude, IsNumber, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class LocationPingDto {
  @IsUUID()
  tripId: string;

  @IsLatitude()
  @Type(() => Number)
  lat: number;

  @IsLongitude()
  @Type(() => Number)
  lng: number;

  @IsOptional() @IsNumber() @Min(0) @Max(360) @Type(() => Number)
  heading?: number;

  @IsOptional() @IsNumber() @Min(0) @Type(() => Number)
  speed?: number;
}