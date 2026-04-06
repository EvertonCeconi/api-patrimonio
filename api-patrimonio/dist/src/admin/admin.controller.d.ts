import type { Request } from 'express';
import { AdminService } from './admin.service';
import { CreateUserDto, UpdateUserDto, UserPaginationDto } from './dtos/admin';
export declare class AdminController {
    private adminService;
    constructor(adminService: AdminService);
    findAllUsers(query: UserPaginationDto): Promise<{
        data: {
            name: string;
            email: string;
            role: import("@prisma/client").$Enums.Role;
            isActive: boolean;
            id: string;
            createdAt: Date;
            updatedAt: Date;
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
    findUserById(id: string): Promise<{
        name: string;
        email: string;
        role: import("@prisma/client").$Enums.Role;
        isActive: boolean;
        id: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    createUser(body: CreateUserDto): Promise<{
        name: string;
        email: string;
        role: import("@prisma/client").$Enums.Role;
        isActive: boolean;
        id: string;
        createdAt: Date;
    }>;
    updateUser(id: string, body: UpdateUserDto, req: Request): Promise<{
        name: string;
        email: string;
        role: import("@prisma/client").$Enums.Role;
        isActive: boolean;
        id: string;
        updatedAt: Date;
    }>;
    activateUser(id: string): Promise<{
        name: string;
        email: string;
        isActive: boolean;
        id: string;
    }>;
    promoteToAdmin(id: string): Promise<{
        name: string;
        email: string;
        role: import("@prisma/client").$Enums.Role;
        id: string;
    }>;
    deleteUser(id: string, req: Request): Promise<{
        message: string;
    }>;
}
