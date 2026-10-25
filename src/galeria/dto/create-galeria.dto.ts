import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { IsImagenUrl } from '../../common/validadores';

/**
 * Body de `POST /api/galeria`: registra un tatuaje ya subido.
 * `imagen_url` NO se valida con `@IsUrl()` porque el backend guarda rutas
 * relativas ("/api/imagenes/<id>"): `IsImagenUrl` acepta URL absoluta, esa ruta
 * y también la legacy "/uploads/<archivo>".
 */
export class CreateGaleriaDto {
  /** Usuario que sube la foto: FK a `usuarios.id` (por eso `@Min(1)`). */
  @IsInt()
  @Min(1)
  subido_por: number;

  /**
   * Opcional: tatuador autor de la pieza. Si falta, la foto queda sin atribuir
   * (por eso en la BD la columna es nullable).
   */
  @IsOptional()
  @IsInt()
  @Min(1)
  empleado_id?: number;

  // URL absoluta o ruta del backend ("/api/imagenes/<id>").
  // Obligatorio, como `subido_por`: el binario ya tiene que existir y lo crea
  // `POST /api/galeria/upload` (aquí no se sube ningún archivo).
  @IsString()
  @IsImagenUrl()
  imagen_url: string;

  /** Opcional: nombre visible de la pieza en el feed. */
  @IsOptional()
  @IsString()
  titulo?: string;

  /** Opcional: descripción libre (motivo, técnica, sesiones...). */
  @IsOptional()
  @IsString()
  descripcion?: string;

  /** Opcional: estilo del tatuaje ("realismo", "tradicional"...), texto libre. */
  @IsOptional()
  @IsString()
  estilo?: string;
}
