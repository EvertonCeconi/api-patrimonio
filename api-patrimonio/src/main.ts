import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import 'dotenv/config';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());
  app.useGlobalFilters(new PrismaExceptionFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,

      exceptionFactory: (errors) => {
        const formatted = errors.flatMap((err) => {
          const constraints = err.constraints ?? {};

          return Object.keys(constraints).map((key) => ({
            field: err.property,
            code: mapConstraintToCode(key),
          }));
        });

        return new BadRequestException({
          errors: formatted,
        });
      },
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap().catch(() => {
  process.exit(1);
});
function mapConstraintToCode(constraint: string): string {
  const map: Record<string, string> = {
    isIP: 'INVALID_IP',
    isNotEmpty: 'REQUIRED',
    isString: 'INVALID_TYPE',
    isEnum: 'INVALID_ENUM',
  };

  return map[constraint] || 'INVALID_FIELD';
}
