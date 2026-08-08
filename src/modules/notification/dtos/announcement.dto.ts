import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';

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
  @IsIn(['driver', 'passenger', 'all', 'both'])
  target?: string;
}