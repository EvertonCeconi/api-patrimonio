import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';

@Controller('equipments')
export class EquipmentsController {
  @Get()
  @UseGuards(JwtAuthGuard)
  findAll() {
    return { message: 'rota protegida!' };
  }
}
