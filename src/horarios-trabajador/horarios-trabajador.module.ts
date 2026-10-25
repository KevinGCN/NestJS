import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { HorariosTrabajadorController } from './horarios-trabajador.controller';
import { HorariosTrabajadorService } from './horarios-trabajador.service';

/**
 * Módulo de horarios de los tatuadores (plantilla semanal).
 * Provee `HorariosTrabajadorController` + `HorariosTrabajadorService` y expone
 * el servicio (hoy solo lo importa `AppModule`). Cada fila es una franja
 * "día de la semana + hora inicio/fin" de un empleado del catálogo.
 */
@Module({
  imports: [PrismaModule],
  controllers: [HorariosTrabajadorController],
  providers: [HorariosTrabajadorService],
  exports: [HorariosTrabajadorService],
})
export class HorariosTrabajadorModule {}
