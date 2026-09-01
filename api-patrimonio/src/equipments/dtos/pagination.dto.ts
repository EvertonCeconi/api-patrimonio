import {
  IsOptional,
  IsInt,
  Min,
  Max,
  IsEnum,
  IsString,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Estado } from '@prisma/client';

export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1, {
    context: { min: 1 },
  })
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1, {
    context: { min: 1 },
  })
  @Max(100, {
    context: { max: 100 },
  })
  limit: number = 50;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255, {
    context: { max: 255 },
  })
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255, {
    context: { max: 255 },
  })
  model?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255, {
    context: { max: 255 },
  })
  serialNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255, {
    context: { max: 255 },
  })
  ipAddress?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255, {
    context: { max: 255 },
  })
  location?: string;

  @IsOptional()
  @IsEnum(Estado)
  status?: Estado;
}
