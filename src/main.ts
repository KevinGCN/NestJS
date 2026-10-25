/**
 * Punto de entrada del API (NestJS 11).
 *
 * Arranca la aplicación Express que sirve `AppModule` en el puerto que asigne
 * Railway (o 3000 en local) y fija las tres decisiones globales que afectan a
 * TODAS las rutas: el prefijo `/api`, el `ValidationPipe` y el CORS.
 */

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

  // Todas las rutas del API viven bajo /api (p. ej. /api/health, /api/auth/login).
  // El frontend define esa misma base en `environment.apiUrl`, así que no hay
  // ruta pública sin prefijo excepto las imágenes legacy de /uploads.
  app.setGlobalPrefix('api');

  // CORS: el frontend de desarrollo (ng serve en localhost:4200) y los
  // despliegues de Netlify. `FRONTEND_URL` añade más orígenes sin tocar código
  // (varios separados por comas, p. ej.
  // "https://mi-app.netlify.app,https://otro.netlify.app"). En producción SI
  // hay que definirla: sin ella el navegador recibe "blocked by CORS policy" y
  // nunca llega a llamar al API.
  const origenes = [
    'http://localhost:4200',
    'https://ink-creature-v2.netlify.app',
    'https://inkcreature.netlify.app',
  ];
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

  // ValidationPipe global sobre los DTO:
  // - whitelist: descarta cualquier propiedad que no esté declarada en el DTO
  //   (evita que un cliente cuele campos como `rol` al actualizar un usuario).
  // - forbidNonWhitelisted: en vez de descartar en silencio, responde 400 si el
  //   body trae una propiedad desconocida; así un intento de inyección de
  //   campos se nota en lugar de pasar desapercibido.
  // - transform: convierte el cuerpo/params al tipo del DTO (p. ej. strings
  //   numéricos de la URL → number) y aplica las conversiones de class-transformer.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Las imagenes ya NO se guardan en disco: viven en la base de datos y se
  // sirven con GET /api/imagenes/:id. Este servicio estatico se mantiene
  // solo por compatibilidad con imagenes legacy que quedaran en /uploads/.
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' });

  // Railway inyecta PORT en el contenedor; el 3000 es solo el valor de respaldo
  // para desarrollo local (`npm run start:dev`).
  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();