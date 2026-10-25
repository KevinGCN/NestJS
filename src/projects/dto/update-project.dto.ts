/**
 * DTO de actualización (PATCH parcial).
 *
 * `PartialType` clona `CreateProjectDto` y marca todas las propiedades como
 * opcionales, conservando los validadores: así un PATCH con un solo campo no
 * exige los demás, pero lo que venga sigue validándose igual.
 */

import { PartialType } from '@nestjs/mapped-types';
import { CreateProjectDto } from './create-project.dto';

export class UpdateProjectDto extends PartialType(CreateProjectDto) {}
