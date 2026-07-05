import { Global, Module } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';

const isDev = process.env.NODE_ENV !== 'production';

@Global()
@Module({
  imports: [
    WinstonModule.forRoot({
      transports: [
        new winston.transports.Console({
          format: isDev
            ? winston.format.combine(
                winston.format.colorize(),
                winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                winston.format.printf(({ timestamp, level, message, context, requestId }) => {
                  const ctx = context ? `[${context}]` : '';
                  const rid = requestId ? ` rid=${requestId}` : '';
                  return `${timestamp} ${level} ${ctx}${rid} ${message}`;
                }),
              )
            : winston.format.combine(
                winston.format.timestamp(),
                winston.format.json(),
              ),
        }),
      ],
    }),
  ],
})
export class LoggerModule {}
