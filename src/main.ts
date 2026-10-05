import * as dotenv from 'dotenv';
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { UPLOADS_DIR } from './uploads/uploads.controller';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // Sirve las imágenes subidas: GET /files/<archivo>
  app.useStaticAssets(UPLOADS_DIR, { prefix: '/files' });

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
