import {
  Body,
  Controller,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { SignInDto, SignUpDto } from './dtos/auth';
import { AuthService } from './auth.service';
import {
  refreshTokenCookieOptions,
  clearRefreshTokenCookieOptions,
} from '../common/utils/cookie';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  async signUp(@Body() body: SignUpDto) {
    return this.authService.signUp(body);
  }

  @Post('signin')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  async signIn(
    @Body() body: SignInDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.signIn(body);

    res.cookie(
      'refresh_token',
      result.refresh_token,
      refreshTokenCookieOptions(),
    );

    return {
      access_token: result.access_token,
      user: result.user,
    };
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.refresh_token as string | undefined;

    if (refreshToken) {
      await this.authService.signOut(refreshToken);
    }

    res.clearCookie('refresh_token', clearRefreshTokenCookieOptions());

    return { message: 'Sessão encerrada com sucesso' };
  }

  @Post('refresh')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.refresh_token as string | undefined;

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token não encontrado');
    }

    const result = await this.authService.refreshToken(refreshToken);

    res.cookie(
      'refresh_token',
      result.refresh_token,
      refreshTokenCookieOptions(),
    );

    return {
      access_token: result.access_token,
    };
  }
}
