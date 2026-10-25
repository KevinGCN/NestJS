/**
 * Estrategia Passport que valida el JWT del header `Authorization`.
 *
 * `validate()` NO se limita a confiar en la firma: vuelve a buscar el usuario en
 * la BD. Por eso borrar una cuenta (o cambiarle el rol) invalida al instante los
 * tokens ya emitidos, sin necesidad de una lista de revocación. El usuario
 * público que devuelve se guarda en `request.user`.
 *
 * `ignoreExpiration: false` es el valor por defecto y se deja explícito para que
 * quede claro que un token caducado produce 401 (el frontend entonces limpia la
 * sesión y manda a login).
 */

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsuariosService } from '../usuarios/usuarios.service';
import { jwtConfig } from './auth.config';

type JwtPayload = { sub: number; iat: number; exp: number };

/**
 * Extrae el token del header `Bearer`, lo verifica con el mismo secreto con el
 * que se firmó y delega en `validate()`.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly usuariosService: UsuariosService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtConfig.secret,
    });
  }

  async validate(payload: JwtPayload) {
    const usuario = await this.usuariosService.obtenerPublicoOrNull(payload.sub);

      if (!usuario || !usuario.activo) {
      // La cuenta no existe o está desactivada.
      throw new UnauthorizedException('Sesión inválida');
    }

    return usuario; // Nest lo coloca en request.user
  }
}