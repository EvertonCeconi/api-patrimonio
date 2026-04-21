import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    console.error('[PrismaExceptionFilter]', {
      code: exception.code,
      message: exception.message,
      meta: exception.meta,
    });

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error = 'Internal Server Error';

    switch (exception.code) {
      case 'P2002': {
        status = HttpStatus.CONFLICT;
        error = 'Conflict';

        const cause = (exception.meta?.driverAdapterError as any)?.cause;
        const constraint: string = cause?.originalMessage ?? '';

        // extrai o nome do campo do constraint, ex: "equipments_serialNumber_key"
        const match = constraint.match(/"equipments_(.+)_key"/);
        message = match ? match[1] : 'unknown';
        break;
      }
      case 'P2025':
        status = HttpStatus.NOT_FOUND;
        message = 'Record not found';
        error = 'Not Found';
        break;

      case 'P2003':
        status = HttpStatus.BAD_REQUEST;
        message = 'Foreign key constraint failed';
        error = 'Bad Request';
        break;
    }

    return response.status(status).json({
      message,
      error,
      statusCode: status,
    });
  }
}
