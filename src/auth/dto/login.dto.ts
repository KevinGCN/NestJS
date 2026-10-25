/**
 * Cuerpo de `POST /api/auth/login`.
 *
 * Solo valida forma (email bien escrito y contraseña no vacía); si las
 * credenciales existen se decide en `AuthService`. El `ValidationPipe` global
 * descarta cualquier propiedad extra del body.
 */

import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  // No se valida longitud ni complejidad aquí: la política de contraseñas se
  // aplica al registrarse; en el login solo importa que venga un valor.
  @IsString()
  @IsNotEmpty()
  password: string;
}