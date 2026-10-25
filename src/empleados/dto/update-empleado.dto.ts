import { IsBoolean, IsOptional, IsString } from 'class-validator';

/**
 * Body de `PATCH /api/empleados/:id` (todo opcional).
 * A propósito NO incluye `usuario_id`: mover una fila de un usuario a otro
 * rompería el historial del tatuador (citas y galería cuelgan de esta fila).
 * Para "cambiar de tatuador" se borra la fila y se crea otra.
 */
export class UpdateEmpleadoDto {
  @IsOptional()
  @IsString()
  /** Opcional: si no viene, la especialidad actual se conserva. */
  especialidad?: string;

  @IsOptional()
  @IsString()
  /** Opcional: texto libre del perfil. */
  biografia?: string;

  @IsOptional()
  @IsBoolean()
  /**
   * Poner `false` "jubila" al tatuador sin borrar su historial: desaparece del
   * catálogo pero conserva citas y fotos. Borrar la fila, en cambio, choca con
   * las FK de citas/horarios (ver `EmpleadosService.eliminar`).
   */
  activo?: boolean;
}
