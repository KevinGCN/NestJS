/**
 * Cuerpo de `POST /auth/google`.
 *
 * El frontend obtiene este `idToken` de Firebase después del popup de Google
 * y lo envía al backend, que lo verifica y devuelve un JWT propio.
 */

import { IsString, MinLength } from 'class-validator';

export class GoogleLoginDto {
  @IsString()
  @MinLength(20)
  idToken: string;
}
