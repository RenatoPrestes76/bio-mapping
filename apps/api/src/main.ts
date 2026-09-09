import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { join } from 'node:path';
import helmet from 'helmet';
import compression = require('compression');
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' });

  const logger = app.get(WINSTON_MODULE_NEST_PROVIDER);
  app.useLogger(logger);

  app.use(helmet());
  app.use(compression());

  // credentials: true nunca foi usado aqui — auth é 100% Bearer token via header
  // (ExtractJwt.fromAuthHeaderAsBearerToken(), zero cookie em toda a API/web).
  // Com CORS_ORIGIN default '*', `credentials: true` produzia a combinação
  // Access-Control-Allow-Origin: * + Access-Control-Allow-Credentials: true,
  // inválida pela spec CORS — navegadores rejeitam requisições credentialed
  // nesse caso. Removido por não ter função real.
  //
  // CORS_ORIGIN aceita uma lista separada por vírgula (múltiplos frontends,
  // ex.: staging + produção). Passar array (não string fixa) para `cors` faz
  // validar a Origin da requisição contra a lista e refletir só quando bate —
  // com string fixa, o pacote `cors` ecoa esse valor sempre, mesmo pra origem
  // não autorizada (inofensivo pro browser, que compara contra a própria
  // origem, mas não é o comportamento determinístico esperado).
  const corsOriginEnv = process.env.CORS_ORIGIN ?? '*';
  const corsOrigin =
    corsOriginEnv === '*' ? '*' : corsOriginEnv.split(',').map((o) => o.trim());
  app.enableCors({
    origin: corsOrigin,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  });

  app.setGlobalPrefix('api/v1', { exclude: ['health'] });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter(logger));
  app.useGlobalInterceptors(new LoggingInterceptor(logger));

  const swaggerConfig = new DocumentBuilder()
    .setTitle('BioMapping API')
    .setDescription(
      'PERSONA — Usuários, Perfis, Profissionais, Pacientes, Organizações, Convites',
    )
    .setVersion(process.env.npm_package_version ?? '0.1.0')
    .addBearerAuth()
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, swaggerDocument);

  // Habilita lifecycle hooks do NestJS para graceful shutdown.
  // Ao receber SIGTERM (via tini), o NestJS drena conexões abertas antes de encerrar.
  app.enableShutdownHooks();

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  logger.log(`Application running on port ${port}`, 'Bootstrap');
}

bootstrap();
