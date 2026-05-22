import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, ValidateNested } from 'class-validator';

export interface IPaged<T> {
  data: T;
  meta: IPagedMeta;
}

export interface IPagedMeta {
  page: number;
  limit: number;
  count: number;
  previousPage: boolean | number;
  nextPage: boolean | number;
  pageCount: number;
  totalRecords: number;
}

export class PagedMetaDto implements IPagedMeta {
  @ApiProperty() @IsNumber() page: number;
  @ApiProperty() @IsNumber() limit: number;
  @ApiProperty() @IsNumber() count: number;
  @ApiProperty() @IsNumber() previousPage: boolean | number;
  @ApiProperty() @IsNumber() nextPage: boolean | number;
  @ApiProperty() @IsNumber() pageCount: number;
  @ApiProperty() @IsNumber() totalRecords: number;
}

export class PagedDto<T> implements IPaged<T> {
  @ApiProperty({ type: 'array', isArray: true })
  @ValidateNested({ each: true })
  data: T;

  @ApiProperty()
  @ValidateNested()
  @Type(() => PagedMetaDto)
  meta: PagedMetaDto;
}
