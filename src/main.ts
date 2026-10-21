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

  // CORS: el frontend de desarrollo (ng serve en localhost:4200) y el
  // desplegado en Netlify. FRONTEND_URL admite varios origenes separados
  // por comas, p. ej. "https://mi-app.netlify.app,https://otro.netlify.app".
  // En produccion SI hay que definirla: sin ella el navegador recibe
  // "blocked by CORS policy" y nunca llega a llamar al API.
  const origenes = ['http://localhost:4200'];
  const frontends = process.env.FRONTEND_URL;
  if (frontends) {
    origenes.push(
      ...frontends
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean),
    );
  }

  app.enableCors({ origin: origenes });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // Las imagenes ya NO se guardan en disco: viven en la base de datos y se
  // sirven con GET /api/imagenes/:id. Este servicio estatico se mantiene
  // solo por compatibilidad con imagenes legacy que quedaran en /uploads/.
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' });

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
