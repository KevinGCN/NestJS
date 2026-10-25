/**
 * Servicio de ejemplo: NO toca la base de datos.
 *
 * Cada método devuelve un string describiendo la acción, que es lo que genera el
 * CLI de Nest. Se conserva como referencia de la forma que tendría un servicio
 * real (inyectable, un método por operación del controlador).
 */

import { Injectable } from '@nestjs/common';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectsService {
  // `JSON.stringify` con sangría solo para que el stub sea legible en la respuesta.
  create(createProjectDto: CreateProjectDto) {
    return `This action adds a new project:
      createProjectDto: ${JSON.stringify(createProjectDto, null, 2)}`;
  }

  findAll() {
    return 'This action returns all projects';
  }

  findOne(id: number) {
    return `This action returns a #${id} project`;
  }

  update(id: number, updateProjectDto: UpdateProjectDto) {
    return `This action updates a #${id} project`;
  }

  remove(id: number) {
    return `This action removes a #${id} project`;
  }
}