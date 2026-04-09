import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AdminService } from './admin.service';
import { CreateUserDto, UpdateUserDto, UserPaginationDto } from './dtos/admin';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('users')
  findAllUsers(@Query() query: UserPaginationDto) {
    return this.adminService.findAllUsers(query);
  }

  @Get('users/:id')
  findUserById(@Param('id') id: string) {
    return this.adminService.findUserById(id);
  }

  @Post('users')
  createUser(@Body() body: CreateUserDto) {
    return this.adminService.createUser(body);
  }

  @Patch('users/:id')
  updateUser(
    @Param('id') id: string,
    @Body() body: UpdateUserDto,
    @Req() req: Request,
  ) {
    const requester = req.user as { id: string };
    return this.adminService.updateUser(id, body, requester.id);
  }

  @Patch('users/:id/activate')
  activateUser(@Param('id') id: string) {
    return this.adminService.activateUser(id);
  }

  @Patch('users/:id/promote')
  promoteToAdmin(@Param('id') id: string) {
    return this.adminService.promoteToAdmin(id);
  }

  @Delete('users/:id')
  deleteUser(@Param('id') id: string, @Req() req: Request) {
    const requester = req.user as { id: string };
    return this.adminService.deleteUser(id, requester.id);
  }
}
