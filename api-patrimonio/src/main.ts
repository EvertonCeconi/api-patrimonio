import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import cookieParser from 'cookie-parser';
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

bootstrap().catch(() => {
  process.exit(1);
});
