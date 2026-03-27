import { Injectable, NotFoundException } from '@nestjs/common';
import { EquipmentDto } from './dtos/equipment.dto';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateEquipmentDto } from './dtos/update-equipment.dto';
import { PaginationDto } from './dtos/pagination.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class EquipmentsService {
  constructor(private readonly prisma: PrismaService) {}
  async create(dto: EquipmentDto) {
    return this.prisma.equipment.create({
      data: dto,
    });
  }

  async update(id: string, dto: UpdateEquipmentDto) {
    return this.prisma.equipment.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    return this.prisma.equipment.delete({
      where: { id },
    });
  }

  async findOne(id: string) {
    const equipment = await this.prisma.equipment.findUnique({
      where: { id },
    });

    if (!equipment) {
      throw new NotFoundException(`Equipamento ${id} não encontrado`);
    }

    return equipment;
  }

  async findAll(query: PaginationDto) {
    const { page, limit, search, estado } = query;

    const skip = (page - 1) * limit;

    const where: Prisma.EquipmentWhereInput = {
      ...(estado && { estado }),
      ...(search && {
        OR: [
          { nome: { contains: search, mode: 'insensitive' } },
          { modelo: { contains: search, mode: 'insensitive' } },
          { patrimonio: { contains: search, mode: 'insensitive' } },
          { numeroSerie: { contains: search, mode: 'insensitive' } },
          { ip: { contains: search, mode: 'insensitive' } },
          { descricao: { contains: search, mode: 'insensitive' } },
          { localizacao: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.equipment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.equipment.count({ where }),
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
}
