import { Estado } from '@prisma/client';
export declare class EquipmentDto {
    name: string;
    assetTag?: string;
    serialNumber?: string;
    ipAddress?: string;
    model?: string;
    description?: string;
    status?: Estado;
    location: string;
}
