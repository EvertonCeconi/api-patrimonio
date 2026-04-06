import { Role } from '@prisma/client';
export declare class CreateUserDto {
    name: string;
    email: string;
    password: string;
    role?: Role;
    isActive?: boolean;
}
export declare class UpdateUserDto {
    name?: string;
    email?: string;
    password?: string;
    role?: Role;
    isActive?: boolean;
}
export declare class UserPaginationDto {
    page: number;
    limit: number;
    search?: string;
    role?: Role;
    isActive?: boolean;
}
