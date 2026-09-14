import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import 'dotenv/config';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';

// ✅ tipo custom (clean)
type ValidationContexts = {
  minLength?: { min: number };
  maxLength?: { max: number };
  min?: { min: number };
  max?: { max: number };
};

// ✅ helper para extrair meta
function extractMeta(contexts: ValidationContexts | undefined, key: string) {
  switch (key) {
    case 'minLength':
      return { min: contexts?.minLength?.min };
    case 'maxLength':
      return { max: contexts?.maxLength?.max };
    case 'min':
      return { min: contexts?.min?.min };
    case 'max':
      return { max: contexts?.max?.max };
    default:
      return undefined;
  }
}

// ✅ map centralizado
function mapConstraintToCode(constraint: string): string {
  const map: Record<string, string> = {
    isNotEmpty: 'REQUIRED',
    isString: 'INVALID_TYPE',
    isEmail: 'INVALID_EMAIL',
    isEnum: 'INVALID_ENUM',
    isBoolean: 'INVALID_BOOLEAN',
    isInt: 'INVALID_NUMBER',

    minLength: 'MIN_LENGTH',
    maxLength: 'MAX_LENGTH',

    min: 'MIN_VALUE',
    max: 'MAX_VALUE',
  };

  return map[constraint] || 'INVALID_FIELD';
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // ✅ confia no primeiro hop (nginx) para req.ip/req.ips refletirem o cliente real
  app.set('trust proxy', 1);

  app.use(helmet());
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
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
          const contexts = err.contexts as ValidationContexts | undefined;

          return Object.keys(constraints).map((key) => {
            const code = mapConstraintToCode(key);
            const meta = extractMeta(contexts, key);

            return {
              field: err.property,
              code,
              ...(meta && { meta }),
            };
          });
        });

        return new BadRequestException({
          errors: formatted,
        });
      },
    }),
  );

  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}

bootstrap().catch((err) => {
  console.error('Falha ao iniciar servidor', err);
  process.exit(1);
});
