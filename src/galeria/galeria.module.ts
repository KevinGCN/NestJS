import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ImagenesModule } from '../imagenes/imagenes.module';
import { GaleriaController } from './galeria.controller';
import { GaleriaService } from './galeria.service';

/**
 * Módulo de la galería de tatuajes (metadatos: título, estilo, autor...).
 * Provee `GaleriaController` + `GaleriaService`; no se exporta porque nadie
 * inyecta el servicio (empleados lee la relación `galeria` por Prisma).
 * Importa `ImagenesModule` porque el binario de la foto vive en la base de
 * datos (tabla `imagenes`) y se guarda/borra con `ImagenesService`.
 */
@Module({
  imports: [PrismaModule, ImagenesModule],
  controllers: [GaleriaController],
  providers: [GaleriaService],
})
export class GaleriaModule {}
