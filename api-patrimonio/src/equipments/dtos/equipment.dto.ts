import { Estado } from '@prisma/client';
import {
  IsEnum,
  IsIP,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class EquipmentDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  assetTag: string;

  @IsNotEmpty()
  @IsString()
  serialNumber: string;

  @IsOptional()
  @IsIP()
  ipAddress?: string;

  @IsNotEmpty()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(Estado)
  status?: Estado;

  @IsNotEmpty()
  @IsString()
  location: string;
}
