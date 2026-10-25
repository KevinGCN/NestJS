import * as dotenv from 'dotenv';
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { UPLOADS_DIR } from './uploads/uploads.controller';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.setGlobalPrefix('api');

  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'https://ink-creature-v2.netlify.app',
  });

  app.enableCors({
  origin: [
    'http://localhost:4200',
    'https://ink-creature-v2.netlify.app',
  ],
});

  app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
);

  // Sirve las imágenes subidas en /uploads/<archivo>
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' });

  // Sirve las imágenes subidas: GET /files/<archivo>
  app.useStaticAssets(UPLOADS_DIR, { prefix: '/files' });

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
