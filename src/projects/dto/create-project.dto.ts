/**
 * DTO de creación de un proyecto (ejemplo).
 *
 * Los decoradores de class-validator son lo que el `ValidationPipe` global
 * ejecuta: si el body no cumple, la petición se rechaza con 400 antes de llegar
 * al controlador. `!` indica que la propiedad la rellena el pipe, no el
 * constructor.
 */

import { IsNotEmpty, IsUUID, IsString, MinLength } from 'class-validator';

export class CreateProjectDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  name!: string;

  @IsNotEmpty()
  @IsString()
  description!: string;

  // Referencia a otra entidad por UUID (no se valida que exista: este CRUD es un stub).
  @IsUUID()
  categoryEditionId!: string;
}
