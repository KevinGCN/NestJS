/**
 * Módulo de inteligencia artificial.
 *
 * No importa nada: `IaService` solo depende de `process.env.GEMINI_API_KEY`
 * (se lee en cada petición), así que la app puede arrancar sin la clave y el
 * módulo queda aislado del resto de la configuración.
 */
import { Module } from '@nestjs/common';
import { IaController } from './ia.controller';
import { IaService } from './ia.service';

@Module({
  controllers: [IaController],
  providers: [IaService],
})
export class IaModule {}
