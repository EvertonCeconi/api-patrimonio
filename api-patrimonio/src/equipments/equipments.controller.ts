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
} from '@nestjs/common';
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

  @Get()
  findAll(@Query() query: PaginationDto) {
    return this.equipmentService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.equipmentService.findOne(id);
  }
}
