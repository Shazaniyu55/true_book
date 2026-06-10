import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsObject,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class DriverDocumentItemDto {
  @IsString()
  @IsNotEmpty()
  documentType: string;

  @IsString()
  @IsNotEmpty()
  documentUrl: string;

  @IsObject()
  @IsOptional()
  verificationData?: Record<string, any>;
}

export class AddDriverDocumentsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DriverDocumentItemDto)
  documents: DriverDocumentItemDto[];
}