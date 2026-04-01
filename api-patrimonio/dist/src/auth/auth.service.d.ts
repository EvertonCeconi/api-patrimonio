import { JwtService } from '@nestjs/jwt';
import { SignInDto, SignUpDto } from './dtos/auth';
import { PrismaService } from '../prisma/prisma.service';
export declare class AuthService {
    private prismaService;
    private jwtService;
    constructor(prismaService: PrismaService, jwtService: JwtService);
    private generateRefreshToken;
    signUp(data: SignUpDto): Promise<{
        id: string;
        email: string;
        name: string;
    }>;
    signIn(data: SignInDto): Promise<{
        access_token: string;
        refresh_token: `${string}-${string}-${string}-${string}-${string}`;
        user: {
            id: string;
            email: string;
            role: import("@prisma/client").$Enums.Role;
        };
    }>;
    signOut(token: string): Promise<void>;
    refreshToken(token: string): Promise<{
        access_token: string;
        refresh_token: `${string}-${string}-${string}-${string}-${string}`;
        user: {
            id: string;
            email: string;
            role: import("@prisma/client").$Enums.Role;
        };
    }>;
}
