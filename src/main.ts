import 'dotenv/config';
// ^ DEBE ser el primer import: si va después, los `import` de TS se "elevan"
//   y app.module (AuthModule → auth.config.ts) leería process.env ANTES de
//   cargar el .env, crasheando con "Falta la variable de entorno JWT_SECRET".

import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.setGlobalPrefix('api');

  // Una sola configuración de CORS (dos llamadas seguidas se pisaban entre sí:
  // la de localhost anulaba la de producción y Netlify recibía bloqueo CORS).
  const orígenes = ['http://localhost:4200'];
  if (process.env.FRONTEND_URL) {
    orígenes.push(process.env.FRONTEND_URL);
  }

  app.enableCors({ origin: orígenes });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // Sirve las imágenes subidas en /uploads/<archivo>
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' });

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
