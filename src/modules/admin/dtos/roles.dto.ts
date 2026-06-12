import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
  IsUUID,
} from 'class-validator';

export class UpdateRoleDto {
  @ApiPropertyOptional({ example: 'Support' })
  @IsOptional() @IsString() name?: string;

  @ApiPropertyOptional({ example: ['payout.view', 'payout.approve'], type: [String] })
  @IsOptional() @IsArray() @IsString({ each: true }) permissions?: string[];
}

export class AssignRoleDto {
  @ApiProperty({ description: 'User or Admin UUID' })
  @IsNotEmpty() @IsUUID() userId: string;

  @ApiProperty({ description: 'Role UUID' })
  @IsNotEmpty() @IsUUID() roleId: string;
}

export class InviteAdminDto {
  @ApiProperty({ example: 'John' })
  @IsString() @IsNotEmpty() first_name: string;

  @ApiProperty({ example: 'Doe' })
  @IsString() @IsNotEmpty() last_name: string;

  @ApiProperty({ example: 'john.doe@example.com' })
  @IsEmail() email: string;

  @ApiProperty({ example: 'support', description: 'Role name to assign' })
  @IsString() @IsNotEmpty() role: string;

}

export class UserByRoleQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional() page?: number;

  @ApiPropertyOptional()
  @IsOptional() @IsString() search?: string;

  @ApiPropertyOptional({ description: 'Optional role name filter' })
  @IsOptional() @IsString() role?: string;
}