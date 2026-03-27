import { Estado } from '@prisma/client';
export declare class EquipmentDto {
    nome: string;
    patrimonio?: string;
    numeroSerie?: string;
    ip?: string;
    modelo?: string;
    descricao?: string;
    estado?: Estado;
    localizacao: string;
}
