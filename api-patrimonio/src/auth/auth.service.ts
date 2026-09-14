import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { SignInDto, SignUpDto, ChangePasswordDto } from './dtos/auth';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prismaService: PrismaService,
    private jwtService: JwtService,
  ) {}

  // Hash dummy para igualar o tempo de resposta quando o e-mail não existe
  // (evita timing attack / enumeração de usuários via tempo de resposta)
  private readonly DUMMY_PASSWORD_HASH =
    '$2b$10$iKz9uanhe9tj2dRjq.jJE.U6RbC9LH9qch.RuE45CCElO/UE/3c9e';

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

    // Não revela se o e-mail já está cadastrado (evita enumeração de usuários).
    // E-mail existente: responde sucesso e descarta silenciosamente.
    if (!userExists) {
      const passwordHash = await bcrypt.hash(data.password, 10);

      await this.prismaService.user.create({
        data: {
          name: data.name,
          email: data.email,
          passwordHash,
        },
      });
    }

    return {
      message: 'Cadastro recebido. Aguarde a ativação pelo administrador.',
    };
  }

  async signIn(data: SignInDto) {
    const user = await this.prismaService.user.findUnique({
      where: { email: data.email },
    });

    // Sempre roda bcrypt (com hash dummy quando o usuário não existe) para
    // manter o tempo de resposta constante e esconder se o e-mail existe.
    const passwordMatch = await bcrypt.compare(
      data.password,
      user?.passwordHash ?? this.DUMMY_PASSWORD_HASH,
    );

    if (!user || !passwordMatch || !user.isActive) {
      // Resposta genérica: mesma mensagem para senha errada, usuário
      // inexistente ou conta inativa (evita enumeração via status).
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const payload = { sub: user.id, email: user.email };

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
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
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

    const payload = { sub: user.id, email: user.email };

    const accessToken = await this.jwtService.signAsync(payload);

    await this.prismaService.refreshToken.delete({
      where: { token },
    });

    const newRefreshToken = await this.generateRefreshToken(user.id);

    return {
      access_token: accessToken,
      refresh_token: newRefreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  }

  async changePassword(userId: string, data: ChangePasswordDto) {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado');
    }

    if (!user.isActive) {
      throw new ForbiddenException('Conta inativa');
    }

    if (data.currentPassword === data.newPassword) {
      throw new BadRequestException(
        'Nova senha deve ser diferente da senha atual',
      );
    }

    const isMatch = await bcrypt.compare(
      data.currentPassword,
      user.passwordHash,
    );

    if (!isMatch) {
      throw new UnauthorizedException('Senha atual inválida');
    }

    const passwordHash = await bcrypt.hash(data.newPassword, 10);

    await this.prismaService.$transaction([
      this.prismaService.user.update({
        where: { id: userId },
        data: { passwordHash },
      }),
      this.prismaService.refreshToken.deleteMany({
        where: { userId },
      }),
    ]);

    return { message: 'Senha alterada com sucesso' };
  }
}
