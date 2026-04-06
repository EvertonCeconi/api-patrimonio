import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EquipmentsModule } from './equipments/equipments.module';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [EquipmentsModule, AuthModule, AdminModule, PrismaModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
