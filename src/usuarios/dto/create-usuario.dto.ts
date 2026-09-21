import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class CreateUsuarioDto {
  @IsString()
  @Matches(/\S/)
  nombre: string;

  @IsString()
  @Matches(/\S/)
  apellido: string;

  @IsEmail()
  email: string;

  @IsString()
  @Matches(/\S/)
  @MinLength(8)
  password: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsOptional()
  @IsString()
  foto_perfil_url?: string;
}