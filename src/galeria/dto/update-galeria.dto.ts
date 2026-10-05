import { IsInt, IsOptional, IsString, Matches, Min } from 'class-validator';
import { IMAGEN_MENSAJE, IMAGEN_REGEX } from './create-galeria.dto';

export class UpdateGaleriaDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  subido_por?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  empleado_id?: number;

  @IsOptional()
  @IsString()
  @Matches(IMAGEN_REGEX, { message: IMAGEN_MENSAJE })
  imagen_url?: string;

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
