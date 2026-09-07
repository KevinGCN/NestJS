import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateEmpleadoDto {
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