"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EquipmentsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let EquipmentsService = class EquipmentsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(dto) {
        return this.prisma.equipment.create({
            data: dto,
        });
    }
    async update(id, dto) {
        return this.prisma.equipment.update({
            where: { id },
            data: dto,
        });
    }
    async remove(id) {
        return this.prisma.equipment.delete({
            where: { id },
        });
    }
    async findOne(id) {
        const equipment = await this.prisma.equipment.findUnique({
            where: { id },
        });
        if (!equipment) {
            throw new common_1.NotFoundException(`Equipamento ${id} não encontrado`);
        }
        return equipment;
    }
    async findAll(query) {
        const { page, limit, search, estado } = query;
        const skip = (page - 1) * limit;
        const where = {
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
};
exports.EquipmentsService = EquipmentsService;
exports.EquipmentsService = EquipmentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], EquipmentsService);
//# sourceMappingURL=equipments.service.js.map