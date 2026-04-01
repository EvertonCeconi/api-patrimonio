import { EquipmentDto } from './dtos/equipment.dto';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateEquipmentDto } from './dtos/update-equipment.dto';
import { PaginationDto } from './dtos/pagination.dto';
export declare class EquipmentsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(dto: EquipmentDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        assetTag: string | null;
        serialNumber: string | null;
        ipAddress: string | null;
        model: string | null;
        description: string | null;
        status: import("@prisma/client").$Enums.Estado;
        location: string;
    }>;
    update(id: string, dto: UpdateEquipmentDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        assetTag: string | null;
        serialNumber: string | null;
        ipAddress: string | null;
        model: string | null;
        description: string | null;
        status: import("@prisma/client").$Enums.Estado;
        location: string;
    }>;
    remove(id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        assetTag: string | null;
        serialNumber: string | null;
        ipAddress: string | null;
        model: string | null;
        description: string | null;
        status: import("@prisma/client").$Enums.Estado;
        location: string;
    }>;
    findOne(id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        assetTag: string | null;
        serialNumber: string | null;
        ipAddress: string | null;
        model: string | null;
        description: string | null;
        status: import("@prisma/client").$Enums.Estado;
        location: string;
    }>;
    findAll(query: PaginationDto): Promise<{
        data: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            assetTag: string | null;
            serialNumber: string | null;
            ipAddress: string | null;
            model: string | null;
            description: string | null;
            status: import("@prisma/client").$Enums.Estado;
            location: string;
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
}
