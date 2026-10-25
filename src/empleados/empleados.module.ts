import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EmpleadosController } from './empleados.controller';
import { EmpleadosService } from './empleados.service';

/**
 * Módulo del catálogo de tatuadores (`empleados`).
 * Provee `EmpleadosController` + `EmpleadosService`; necesita `PrismaModule`
 * para acceder a la tabla `empleados` (el servicio también lee `usuarios`).
 * No se exporta: nadie más lo inyecta, cada módulo consulta Prisma directo.
 */
@Module({
  imports: [PrismaModule],
  controllers: [EmpleadosController],
  providers: [EmpleadosService],
})
export class EmpleadosModule {}