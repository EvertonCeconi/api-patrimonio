"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const bcrypt = __importStar(require("bcrypt"));
let AdminService = class AdminService {
    prismaService;
    constructor(prismaService) {
        this.prismaService = prismaService;
    }
    async findAllUsers(query) {
        const { page, limit, search, isActive, role } = query;
        const skip = (page - 1) * limit;
        const where = {
            ...(isActive !== undefined && { isActive }),
            ...(role && { role }),
            ...(search && {
                OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { email: { contains: search, mode: 'insensitive' } },
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
    async findUserById(id) {
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
            throw new common_1.NotFoundException('Usuário não encontrado');
        }
        return user;
    }
    async createUser(data) {
        const userExists = await this.prismaService.user.findUnique({
            where: { email: data.email },
        });
        if (userExists) {
            throw new common_1.ConflictException('Usuário já existe');
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
    async updateUser(id, data, requesterId) {
        await this.findUserById(id);
        if (id === requesterId && data.role && data.role !== 'ADMIN') {
            throw new common_1.ForbiddenException('Você não pode rebaixar sua própria role');
        }
        if (data.email) {
            const emailTaken = await this.prismaService.user.findFirst({
                where: { email: data.email, NOT: { id } },
            });
            if (emailTaken) {
                throw new common_1.ConflictException('E-mail já está em uso');
            }
        }
        const updateData = { ...data };
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
    async activateUser(id) {
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
    async promoteToAdmin(id) {
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
    async deleteUser(id, requesterId) {
        if (id === requesterId) {
            throw new common_1.ForbiddenException('Você não pode excluir sua própria conta');
        }
        await this.findUserById(id);
        await this.prismaService.user.delete({ where: { id } });
        return { message: 'Usuário excluído com sucesso' };
    }
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AdminService);
//# sourceMappingURL=admin.service.js.map