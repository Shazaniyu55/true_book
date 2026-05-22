import { ApiProperty } from '@nestjs/swagger';

import { Transform, Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional } from 'class-validator';

import { IQuery, Order } from '../interface/query.interface';

export class QueryDto implements IQuery {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value, 10))
  page?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value, 10))
  limit?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEnum(Order)
  order?: Order;

  @ApiProperty({ required: false, type: 'object', description: 'Filter parameters as an object' })
  @IsOptional()
  @Type(() => Object)
  search?: string;
}
