import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateAnnouncementDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  body: string;

    @IsString()
  @IsNotEmpty()
  duration: string;

  @IsOptional()
  @IsString()
  target?: string;
}