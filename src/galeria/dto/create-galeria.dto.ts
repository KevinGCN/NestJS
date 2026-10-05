import { IsInt, IsOptional, IsString, Min, IsUrl } from 'class-validator';

export class CreateGaleriaDto {
  @IsInt()
  @Min(1)
  subido_por: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  empleado_id?: number;

  @IsString()
  @IsUrl()
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