import type { Request, Response } from 'express';
import { SignInDto, SignUpDto } from './dtos/auth';
import { AuthService } from './auth.service';
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
    signUp(body: SignUpDto): Promise<{
        id: string;
        email: string;
        name: string;
    }>;
    signIn(body: SignInDto, res: Response): Promise<{
        access_token: string;
    }>;
    logout(req: Request, res: Response): Promise<{
        message: string;
    }>;
    refresh(req: Request, res: Response): Promise<{
        access_token: string;
    }>;
}
