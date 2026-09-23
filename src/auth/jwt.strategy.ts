import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsuariosService } from '../usuarios/usuarios.service';
import { jwtConfig } from './auth.config';

type JwtPayload = { sub: number; iat: number; exp: number };

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly usuariosService: UsuariosService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtConfig.secret,
    });
  }

  async validate(payload: JwtPayload) {
    const usuario = await this.usuariosService.obtenerPublicoOrNull(payload.sub);

    if (!usuario) {
      // El token es válido, pero la cuenta ya no existe → tratamos como sesión inválida
      throw new UnauthorizedException('Sesión inválida');
    }

    return usuario; // Nest lo coloca en request.user
  }
}