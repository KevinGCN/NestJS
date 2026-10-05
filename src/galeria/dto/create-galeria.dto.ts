import { IsInt, IsOptional, IsString, Matches, Min } from 'class-validator';

// Acepta URLs http(s), imágenes subidas (/files/...) e imágenes incluidas en el frontend (image/...).
export const IMAGEN_REGEX = /^(https?:\/\/|\/files\/|image\/).+$/;
export const IMAGEN_MENSAJE =
  'imagen_url debe ser una URL http(s) o una ruta /files/... o image/...';

export class CreateGaleriaDto {
  @IsInt()
  @Min(1)
  subido_por: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  empleado_id?: number;

  @IsString()
  @Matches(IMAGEN_REGEX, { message: IMAGEN_MENSAJE })
  imagen_url: string;

  @IsOptional()
  @IsString()
  titulo?: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsString()
  estilo?: string;
}
