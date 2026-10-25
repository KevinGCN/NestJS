/**
 * Módulo global de base de datos.
 *
 * `@Global()` hace que `PrismaService` esté disponible en cualquier módulo sin
 * repetir `imports: [PrismaModule]`; solo se importa una vez en `AppModule`.
 */

import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}