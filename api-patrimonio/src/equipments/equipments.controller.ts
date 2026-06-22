import {
  Body,
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Query,
  Param,
  UseGuards,
  Res,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { EquipmentDto } from './dtos/equipment.dto';
import { EquipmentsService } from './equipments.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UpdateEquipmentDto } from './dtos/update-equipment.dto';
import { PaginationDto } from './dtos/pagination.dto';

@UseGuards(JwtAuthGuard)
@Controller('equipments')
export class EquipmentsController {
  constructor(private readonly equipmentService: EquipmentsService) {}

  @Post()
  create(@Body() dto: EquipmentDto) {
    return this.equipmentService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateEquipmentDto) {
    return this.equipmentService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.equipmentService.remove(id);
  }

  @Get('export/csv')
  async exportCsv(@Query() query: PaginationDto, @Res() res: Response) {
    const { buffer, filename } = await this.equipmentService.exportCsv(query);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  @Get('export/xlsx')
  async exportXlsx(@Query() query: PaginationDto, @Res() res: Response) {
    const { buffer, filename } = await this.equipmentService.exportXlsx(query);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  @Post('import/preview')
  @SkipThrottle()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const ext = file.originalname.split('.').pop()?.toLowerCase();
        if (ext !== 'csv' && ext !== 'xlsx') {
          return cb(new BadRequestException('Formato não suportado. Use .csv ou .xlsx'), false);
        }
        cb(null, true);
      },
    }),
  )
  async importPreview(
    @UploadedFile() file: Express.Multer.File,
    @Body('mode') mode?: 'upsert' | 'insert',
  ) {
    if (!file) {
      throw new BadRequestException('Arquivo não enviado');
    }
    return this.equipmentService.importPreview(file, mode ?? 'upsert');
  }

  @Post('import/confirm')
  @SkipThrottle()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async importConfirm(@Body() body: { token: string }) {
    if (!body.token) {
      throw new BadRequestException('Token é obrigatório');
    }
    return this.equipmentService.importConfirm(body.token);
  }

  @Get()
  findAll(@Query() query: PaginationDto) {
    return this.equipmentService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.equipmentService.findOne(id);
  }
}
