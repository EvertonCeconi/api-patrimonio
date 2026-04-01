import { Estado } from '@prisma/client';
export declare class PaginationDto {
    page: number;
    limit: number;
    search?: string;
    status?: Estado;
}
