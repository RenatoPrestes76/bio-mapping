import {
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();
    const requestId = crypto.randomUUID();
    const start = Date.now();

    (req as unknown as Record<string, unknown>).requestId = requestId;

    this.logger.log(
      `→ ${req.method} ${req.url} rid=${requestId}`,
      'LoggingInterceptor',
    );

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - start;
        this.logger.log(
          `← ${req.method} ${req.url} ${res.statusCode} ${duration}ms rid=${requestId}`,
          'LoggingInterceptor',
        );
      }),
    );
  }
}
