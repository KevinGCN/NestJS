import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { IsImagenUrl } from '../../common/validadores';

export class CreateGaleriaDto {
  @IsInt()
  @Min(1)
  subido_por: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  empleado_id?: number;

  // URL absoluta o ruta del backend ("/api/imagenes/<id>").
  @IsString()
  @IsImagenUrl()
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
