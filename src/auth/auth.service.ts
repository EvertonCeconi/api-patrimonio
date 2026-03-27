import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { SignInDto, SignUpDto } from './dtos/auth';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prismaService: PrismaService,
    private jwtService: JwtService,
  ) {}

  private async generateRefreshToken(userId: string) {
    const token = randomUUID();

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prismaService.refreshToken.create({
      data: {
        token,
        userId,
        expiresAt,
      },
    });

    return token;
  }

  async signUp(data: SignUpDto) {
    const userExists = await this.prismaService.user.findUnique({
      where: { email: data.email },
    });

    if (userExists) {
      throw new ConflictException('User already exists');
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const user = await this.prismaService.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    return user;
  }

  async signIn(data: SignInDto) {
    const user = await this.prismaService.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatch = await bcrypt.compare(
      data.password,
      user.passwordHash,
    );

    if (!passwordMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { sub: user.id, email: user.email, role: user.role };

    const accessToken = await this.jwtService.signAsync(payload);

    await this.prismaService.refreshToken.deleteMany({
      where: {
        userId: user.id,
      },
    });

    const refreshToken = await this.generateRefreshToken(user.id);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  async signOut(token: string) {
    await this.prismaService.refreshToken.deleteMany({
      where: { token },
    });
  }

  async refreshToken(token: string) {
    const storedToken = await this.prismaService.refreshToken.findUnique({
      where: { token },
      include: {
        user: true,
      },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Token inválido');
    }

    if (storedToken.expiresAt < new Date()) {
      await this.prismaService.refreshToken.deleteMany({
        where: { token },
      });
      throw new UnauthorizedException('Token expirado');
    }

    const { user } = storedToken;
    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    await this.prismaService.refreshToken.delete({
      where: { token },
    });

    const newRefreshToken = await this.generateRefreshToken(user.id);

    return {
      access_token: accessToken,
      refresh_token: newRefreshToken,
    };
  }
}
