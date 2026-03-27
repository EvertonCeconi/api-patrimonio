import { EquipmentDto } from './dtos/equipment.dto';
import { EquipmentsService } from './equipments.service';
import { UpdateEquipmentDto } from './dtos/update-equipment.dto';
import { PaginationDto } from './dtos/pagination.dto';
export declare class EquipmentsController {
    private readonly equipmentService;
    constructor(equipmentService: EquipmentsService);
    create(dto: EquipmentDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        nome: string;
        patrimonio: string | null;
        numeroSerie: string | null;
        ip: string | null;
        modelo: string | null;
        descricao: string | null;
        estado: import("@prisma/client").$Enums.Estado;
        localizacao: string;
    }>;
    update(id: string, dto: UpdateEquipmentDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        nome: string;
        patrimonio: string | null;
        numeroSerie: string | null;
        ip: string | null;
        modelo: string | null;
        descricao: string | null;
        estado: import("@prisma/client").$Enums.Estado;
        localizacao: string;
    }>;
    remove(id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        nome: string;
        patrimonio: string | null;
        numeroSerie: string | null;
        ip: string | null;
        modelo: string | null;
        descricao: string | null;
        estado: import("@prisma/client").$Enums.Estado;
        localizacao: string;
    }>;
    findAll(query: PaginationDto): Promise<{
        data: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            nome: string;
            patrimonio: string | null;
            numeroSerie: string | null;
            ip: string | null;
            modelo: string | null;
            descricao: string | null;
            estado: import("@prisma/client").$Enums.Estado;
            localizacao: string;
        }[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
            hasNextPage: boolean;
            hasPreviousPage: boolean;
        };
        message: string | undefined;
    }>;
    findOne(id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        nome: string;
        patrimonio: string | null;
        numeroSerie: string | null;
        ip: string | null;
        modelo: string | null;
        descricao: string | null;
        estado: import("@prisma/client").$Enums.Estado;
        localizacao: string;
    }>;
}
