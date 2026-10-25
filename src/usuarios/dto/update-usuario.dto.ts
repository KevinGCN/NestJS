import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

/**
 * Body de `PATCH /api/usuarios/:id` (actualización parcial: todo opcional).
 * Deliberadamente NO incluye `rol` ni `activo`: si incluyera `rol`, cualquier
 * usuario con sesión podría mandar {"rol":"admin"} y auto-promocionarse. El rol
 * solo cambia por `PATCH /api/usuarios/:id/rol` (JwtAuthGuard + RolesGuard con
 * @Roles('admin')).
 */
export class UpdateUsuarioDto {
  @IsOptional()
  @IsString()
  @Matches(/\S/)
  /** Si no viene, el campo no se toca (Prisma solo escribe lo enviado). */
  nombre?: string;

  @IsOptional()
  @IsString()
  @Matches(/\S/)
  /** Opcional, igual que `nombre`. */
  apellido?: string;

  @IsOptional()
  @IsEmail()
  /**
   * Opcional. Sigue siendo `@unique` en la BD, pero el servicio no traduce aquí
   * el P2002: un correo repetido no da 409 en este endpoint.
   */
  email?: string;

  @IsOptional()
  @IsString()
  @Matches(/\S/)
  @MinLength(8)
  /**
   * Opcional; si viene se vuelve a cifrar con scrypt antes de guardar. Nunca se
   * devuelve en la respuesta (el servicio usa el select seguro).
   */
  password?: string;

  @IsOptional()
  @IsString()
  /** Opcional: se puede borrar el teléfono enviando una cadena vacía. */
  telefono?: string;

  @IsOptional()
  @IsString()
  /**
   * Ruta ya guardada de la foto ("/api/imagenes/<id>"). Para subir un archivo
   * nuevo se usa `POST /api/usuarios/:id/foto`, que además borra la anterior.
   */
  foto_perfil_url?: string;
}