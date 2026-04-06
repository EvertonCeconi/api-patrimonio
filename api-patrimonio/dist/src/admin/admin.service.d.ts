import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto, UpdateUserDto, UserPaginationDto } from './dtos/admin';
export declare class AdminService {
    private prismaService;
    constructor(prismaService: PrismaService);
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
    createUser(data: CreateUserDto): Promise<{
        name: string;
        email: string;
        role: import("@prisma/client").$Enums.Role;
        isActive: boolean;
        id: string;
        createdAt: Date;
    }>;
    updateUser(id: string, data: UpdateUserDto, requesterId: string): Promise<{
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
    deleteUser(id: string, requesterId: string): Promise<{
        message: string;
    }>;
}
