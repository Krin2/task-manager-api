import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import type { Env } from './config/env.js';

/** Configuracion comun a la app real y a los tests e2e */
export function setupApp(app: INestApplication): void {
  const config = app.get<ConfigService<Env, true>>(ConfigService);

  app.use(helmet());

  const corsOrigin = config.get('CORS_ORIGIN', { infer: true });
  if (corsOrigin) app.enableCors({ origin: corsOrigin });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // descarta campos que no estan en el DTO
      forbidNonWhitelisted: true, // y responde 400 si llegan
      transform: true,
    }),
  );

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Task Manager API')
      .setDescription(
        'API REST de tareas con NestJS, PostgreSQL y JWT. ' +
          'Registrate en POST /auth/register, copia el accessToken y pulsa "Authorize".',
      )
      .setVersion('1.0')
      .addBearerAuth()
      .build(),
  );
  SwaggerModule.setup('docs', app, document);
}
