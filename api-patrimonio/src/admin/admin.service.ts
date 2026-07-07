import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto, UpdateUserDto, UserPaginationDto } from './dtos/admin';
import { buildPaginationMeta } from '../common/utils/pagination';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminService {
  constructor(private readonly prismaService: PrismaService) {}

  private async getFirstAdminId(): Promise<string | null> {
    const firstAdmin = await this.prismaService.user.findFirst({
      where: { role: 'ADMIN' },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
    return firstAdmin?.id ?? null;
  }

  async findUserById(id: string) {
    const user = await this.prismaService.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    return user;
  }

  async getPasswordHash(id: string): Promise<string> {
    const user = await this.prismaService.user.findUnique({
      where: { id },
      select: { passwordHash: true },
    });

    if (!user) throw new NotFoundException('Usuário não encontrado');
    return user.passwordHash;
  }

  async findAllUsers(query: UserPaginationDto) {
    const { page, limit, search, isActive, role } = query;

    if (search && search.length > 100) {
      throw new BadRequestException('Busca muito longa');
    }

    const skip = (page - 1) * limit;

    const where = {
      ...(isActive !== undefined && { isActive }),
      ...(role && { role }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [data, total] = await this.prismaService.$transaction([
      this.prismaService.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prismaService.user.count({ where }),
    ]);

    return {
      data,
      meta: buildPaginationMeta(total, page, limit),
      message: data.length === 0 ? 'Nenhum registro encontrado' : undefined,
    };
  }

  async createUser(data: CreateUserDto) {
    const userExists = await this.prismaService.user.findUnique({
      where: { email: data.email },
    });
    if (userExists) throw new ConflictException('Usuário já existe');

    const passwordHash = await bcrypt.hash(data.password, 10);

    return this.prismaService.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        role: data.role,
        isActive: data.isActive ?? false,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  async updateUser(id: string, data: UpdateUserDto, requesterId: string) {
    const targetUser = await this.findUserById(id);
    const firstAdminId = await this.getFirstAdminId();
    const isTargetOwner = firstAdminId && targetUser.id === firstAdminId;
    const isSelf = requesterId === targetUser.id;

    // 🔒 Owner só pode ser editado por ele mesmo
    if (isTargetOwner && !isSelf) {
      throw new ForbiddenException(
        'O Owner só pode ser editado por ele mesmo.',
      );
    }

    // 🛡 Se for self-edit do owner, bloqueia role e status
    if (isTargetOwner && isSelf) {
      if (data.role && data.role !== targetUser.role) {
        throw new ForbiddenException(
          'Owner não pode alterar sua própria role.',
        );
      }
      if (data.isActive !== undefined) {
        throw new ForbiddenException(
          'Owner não pode alterar seu próprio status.',
        );
      }
    }

    if (data.password && requesterId === id) {
      if (!data.currentPassword) {
        throw new BadRequestException('Senha atual obrigatória');
      }

      const hash = await this.getPasswordHash(id);

      const isMatch = await bcrypt.compare(data.currentPassword, hash);

      if (!isMatch) {
        throw new UnauthorizedException('Credenciais inválidas');
      }
    }

    // 📧 Validação de email duplicado
    if (data.email && data.email !== targetUser.email) {
      const emailTaken = await this.prismaService.user.findFirst({
        where: { email: data.email, NOT: { id } },
      });
      if (emailTaken) throw new ConflictException('E-mail já está em uso');
    }

    const updateData: Record<string, unknown> = { ...data };
    delete updateData.currentPassword; // Remove do payload final para não salvar no banco

    if (data.password) {
      updateData.passwordHash = await bcrypt.hash(data.password, 10);
      delete updateData.password;

      await this.prismaService.refreshToken.deleteMany({
        where: { userId: id },
      });
    }

    return this.prismaService.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        updatedAt: true,
      },
    });
  }

  async activateUser(id: string) {
    await this.findUserById(id);
    return this.prismaService.user.update({
      where: { id },
      data: { isActive: true },
      select: { id: true, name: true, email: true, isActive: true },
    });
  }

  async promoteToAdmin(id: string) {
    await this.findUserById(id);
    return this.prismaService.user.update({
      where: { id },
      data: { role: 'ADMIN' },
      select: { id: true, name: true, email: true, role: true },
    });
  }

  async deleteUser(id: string, requesterId: string) {
    if (id === requesterId)
      throw new ForbiddenException('Você não pode excluir sua própria conta');

    const firstAdminId = await this.getFirstAdminId();
    if (firstAdminId && id === firstAdminId) {
      throw new ForbiddenException(
        'O primeiro administrador do sistema não pode ser excluído.',
      );
    }

    await this.findUserById(id);
    await this.prismaService.user.delete({ where: { id } });
    return { message: 'Usuário excluído com sucesso' };
  }
}
