/**
 * Módulo de almacenamiento de imágenes (binarios en `proyecto7.imagenes`).
 *
 * Exporta `ImagenesService` porque `galeria` y `usuarios` lo inyectan para
 * guardar y borrar los binarios; `PrismaModule` se importa para acceder a la
 * tabla donde viven los datos.
 */
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ImagenesController } from './imagenes.controller';
import { ImagenesService } from './imagenes.service';

@Module({
  imports: [PrismaModule],
  controllers: [ImagenesController],
  providers: [ImagenesService],
  exports: [ImagenesService],
})
export class ImagenesModule {}
