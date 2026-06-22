import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    this.logger.error(`Prisma error code=${exception.code}`, exception.message);

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Erro interno do servidor';

    switch (exception.code) {
      case 'P2002': {
        status = HttpStatus.CONFLICT;
        const cause = (exception.meta?.driverAdapterError as { cause?: { originalMessage?: string } })?.cause;
        const constraint: string = cause?.originalMessage ?? '';
        const match = constraint.match(/"equipments_(.+)_key"/);
        message = match
          ? `Já existe um registro com esse ${match[1]}`
          : 'Conflito de registro duplicado';
        break;
      }
      case 'P2025':
        status = HttpStatus.NOT_FOUND;
        message = 'Registro não encontrado';
        break;
      case 'P2003':
        status = HttpStatus.BAD_REQUEST;
        message = 'Registro relacionado não encontrado';
        break;
    }

    return response.status(status).json({
      status: 'error',
      message,
      data: null,
    });
  }
}
