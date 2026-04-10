import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto, UpdateUserDto, UserPaginationDto } from './dtos/admin';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminService {
  constructor(private prismaService: PrismaService) {}

  private async getFirstAdminId(): Promise<string | null> {
    const firstAdmin = await this.prismaService.user.findFirst({
      where: { role: 'ADMIN' },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
    return firstAdmin?.id ?? null;
  }

  private async guardFirstAdmin(targetId: string, action: string): Promise<void> {
    const firstAdminId = await this.getFirstAdminId();
    if (firstAdminId && targetId === firstAdminId) {
      throw new ForbiddenException(
        `O primeiro administrador do sistema não pode ser ${action}.`,
      );
    }
  }

  // ─── CRUD ─────────────────────────────────────────────────────────────────

  async findAllUsers(query: UserPaginationDto) {
    const { page, limit, search, isActive, role } = query;

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
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPreviousPage: page > 1,
      },
      message: data.length === 0 ? 'No records found' : undefined,
    };
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

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    return user;
  }

  async createUser(data: CreateUserDto) {
    const userExists = await this.prismaService.user.findUnique({
      where: { email: data.email },
    });

    if (userExists) {
      throw new ConflictException('Usuário já existe');
    }

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
    await this.findUserById(id);

    if (id !== requesterId) {
      await this.guardFirstAdmin(id, 'editado');
    }

    if (id === requesterId && data.role && data.role !== 'ADMIN') {
      throw new ForbiddenException('Você não pode rebaixar sua própria role');
    }

    if (data.email) {
      const emailTaken = await this.prismaService.user.findFirst({
        where: { email: data.email, NOT: { id } },
      });

      if (emailTaken) {
        throw new ConflictException('E-mail já está em uso');
      }
    }

    const updateData: Record<string, unknown> = { ...data };

    if (data.password) {
      updateData.passwordHash = await bcrypt.hash(data.password, 10);
      delete updateData.password;
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
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
      },
    });
  }

  async promoteToAdmin(id: string) {
    await this.findUserById(id);

    return this.prismaService.user.update({
      where: { id },
      data: { role: 'ADMIN' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });
  }

  async deleteUser(id: string, requesterId: string) {
    if (id === requesterId) {
      throw new ForbiddenException('Você não pode excluir sua própria conta');
    }

    await this.guardFirstAdmin(id, 'excluído');

    await this.findUserById(id);

    await this.prismaService.user.delete({ where: { id } });

    return { message: 'Usuário excluído com sucesso' };
  }
}
