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
  nome: string;

  @IsOptional()
  @IsString()
  patrimonio?: string;

  @IsOptional()
  @IsString()
  numeroSerie?: string;

  @IsOptional()
  @IsIP()
  ip?: string;

  @IsNotEmpty()
  @IsString()
  modelo?: string;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsOptional()
  @IsEnum(Estado)
  estado?: Estado;

  @IsNotEmpty()
  @IsString()
  localizacao: string;
}
