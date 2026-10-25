import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { IsImagenUrl } from '../../common/validadores';

/**
 * Body de `PATCH /api/galeria/:id`. Todo opcional: se escribe solo lo enviado.
 * Ojo con `imagen_url`: cambiarla aquí NO borra el binario anterior (eso solo
 * pasa en `DELETE /api/galeria/:id`), así que apuntar a otra imagen deja la
 * vieja huérfana en la tabla `imagenes`.
 */
export class UpdateGaleriaDto {
  /** Se puede reasignar quién figura como autor de la subida (admin). */
  @IsOptional()
  @IsInt()
  @Min(1)
  subido_por?: number;

  /** Cambiar el tatuador atribuido (o dejarlo sin autor no es posible por aquí). */
  @IsOptional()
  @IsInt()
  @Min(1)
  empleado_id?: number;

  // URL absoluta o ruta del backend ("/api/imagenes/<id>").
  // Si se cambia, debe ser una imagen ya subida con /api/galeria/upload.
  @IsOptional()
  @IsImagenUrl()
  imagen_url?: string;

  /** Opcional: si no viene, el título actual se mantiene. */
  @IsOptional()
  @IsString()
  titulo?: string;

  /** Opcional: descripción libre del tatuaje. */
  @IsOptional()
  @IsString()
  descripcion?: string;

  /** Opcional: estilo del tatuaje (texto libre, no hay catálogo cerrado). */
  @IsOptional()
  @IsString()
  estilo?: string;
}
