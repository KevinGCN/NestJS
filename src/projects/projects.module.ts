/**
 * Módulo de `projects`: CRUD de ejemplo creado por el CLI de Nest.
 *
 * No pertenece al dominio de Ink-Creature (tatuajes); se deja porque forma parte
 * del esqueleto y sirve de plantilla de estructura controller/service/DTO. No
 * declara `imports` porque el servicio aún no toca la BD.
 */

import { Module } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';

@Module({
  controllers: [ProjectsController],
  providers: [ProjectsService],
})
export class ProjectsModule {}
