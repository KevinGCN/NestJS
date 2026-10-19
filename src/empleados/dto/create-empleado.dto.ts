import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateEmpleadoDto {
  @IsInt()
  @Min(1)
  usuario_id: number;

  @IsOptional()
  @IsString()
  especialidad?: string;

  @IsOptional()
  @IsString()
  biografia?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}