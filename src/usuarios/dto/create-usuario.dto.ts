import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

/**
 * Body de `POST /api/usuarios` (registro público, sin JWT).
 * A propósito NO incluye `rol` ni `activo`: el rol por defecto (`cliente`) lo
 * pone la base de datos y solo un admin puede ascender a alguien. Si estos
 * campos fueran parte del DTO, cualquiera podría registrarse como admin.
 */
export class CreateUsuarioDto {
  @IsString()
  @Matches(/\S/)
  /**
   * Obligatorio. `@Matches(/\S/)` rechaza tanto la cadena vacía como la de solo
   * espacios (que `@IsString()` por sí solo dejaría pasar).
   */
  nombre: string;

  @IsString()
  @Matches(/\S/)
  /** Obligatorio, con la misma regla que `nombre`: no puede quedar en blanco. */
  apellido: string;

  @IsEmail()
  /**
   * Es la credencial de login y una columna `@unique`: el servicio traduce la
   * violación de unicidad (P2002) a un 409 en lugar de un 500 opaco.
   */
  email: string;

  @IsString()
  @Matches(/\S/)
  @MinLength(8)
  /**
   * Viaja en claro solo dentro del request: el servicio la cifra con scrypt
   * (`hashPassword`) y guarda únicamente `password_hash`. Mínimo 8 caracteres.
   */
  password: string;

  @IsOptional()
  @IsString()
  /** Opcional: el usuario puede completar su perfil más adelante (PATCH). */
  telefono?: string;

  @IsOptional()
  @IsString()
  /**
   * Opcional porque el flujo normal es subir el archivo con
   * `POST /api/usuarios/:id/foto` (multipart), que deja aquí la ruta relativa
   * "/api/imagenes/<id>". No debe contener binarios ni claves.
   */
  foto_perfil_url?: string;
}