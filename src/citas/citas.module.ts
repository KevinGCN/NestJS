import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CitasController } from './citas.controller';
import { CitasService } from './citas.service';

/**
 * Módulo de citas (agenda de los tatuadores).
 * Provee `CitasController` + `CitasService`; el servicio se exporta para que
 * otro módulo pueda reutilizar la agenda (hoy solo lo importa `AppModule`).
 * Necesita `PrismaModule` para llegar a las tablas `citas`, `usuarios` y
 * `empleados`.
 */
@Module({
  imports: [PrismaModule],
  controllers: [CitasController],
  providers: [CitasService],
  exports: [CitasService],
})
export class CitasModule {}
