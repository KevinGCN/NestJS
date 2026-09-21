import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateUsuarioDto {
  @IsString()
  nombre: string;

  @IsString()
  apellido: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsOptional()
  @IsString()
  foto_perfil_url?: string;
}