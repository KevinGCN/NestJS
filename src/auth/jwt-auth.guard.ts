/**
 * Guard de autenticación: `@UseGuards(JwtAuthGuard)`.
 *
 * Es un `AuthGuard('jwt')` de Passport, sin lógica extra: si el token falta, está
 * mal firmado, caducó o el usuario ya no existe → 401 y el handler no se ejecuta.
 * Solo autentica; para autorizar por rol hace falta añadir `RolesGuard` después.
 */

import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Nombre 'jwt' = el que declara JwtStrategy en `PassportStrategy(Strategy, 'jwt')`. */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
