import { Estado } from '@prisma/client';
import {
  IsEnum,
  IsIP,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class EquipmentDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  name: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  assetTag: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  serialNumber: string;

  @IsOptional()
  @IsIP()
  ipAddress?: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  model: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsEnum(Estado)
  status?: Estado;

  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  location: string;
}
