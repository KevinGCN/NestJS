import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

/**
 * Body de `POST /api/empleados`: mete a un usuario ya registrado en el catálogo
 * de tatuadores. No se envía aquí su nombre ni su foto: salen de `usuarios`.
 * Tampoco se envía el rol: la fila solo da visibilidad, el permiso se cambia
 * aparte con `PATCH /api/usuarios/:id/rol`.
 */
export class CreateEmpleadoDto {
  @IsInt()
  @Min(1)
  /**
   * Obligatorio y con `@Min(1)` porque es una FK a `usuarios.id`: el 0 o los
   * negativos nunca existen. Debe apuntar a un usuario YA registrado.
   */
  usuario_id: number;

  @IsOptional()
  @IsString()
  /** Opcional: p. ej. "realismo", "blackwork". Se muestra en el catálogo. */
  especialidad?: string;

  @IsOptional()
  @IsString()
  /** Opcional: texto libre del perfil del tatuador. */
  biografia?: string;

  @IsOptional()
  @IsBoolean()
  /** Opcional; si no llega, el servicio guarda `true` (igual que el default de la BD). */
  activo?: boolean;
}
