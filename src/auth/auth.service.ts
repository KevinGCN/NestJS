/**
 * Verifica credenciales y firma el JWT.
 *
 * El token solo lleva `sub` (id del usuario) porque el resto del perfil se
 * relee de la BD en cada request (`JwtStrategy`). Así un cambio de rol o un
 * borrado de cuenta surte efecto sin esperar a que caduque el token.
 */

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsuariosService } from '../usuarios/usuarios.service';
import { LoginDto } from './dto/login.dto';
import { verifyPassword, DUMMY_HASH } from './password';

@Injectable()
export class AuthService {
  constructor(
    private readonly usuariosService: UsuariosService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * `POST /api/auth/login` → `{ access_token, token_type: 'Bearer', expires_in }`.
   * Mismo error para "email no existe" y "contraseña incorrecta": no se revela
   * qué parte falló.
   */
  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const credenciales =
      await this.usuariosService.findCredentialsByEmail(email);

    // Si no existe, igual "gastamos" el mismo tiempo comparando contra DUMMY_HASH
    const passwordValida = await verifyPassword(
      password,
      credenciales ? credenciales.password_hash : DUMMY_HASH,
    );

    if (!credenciales || !passwordValida || !credenciales.activo) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // El token expone el id del usuario en `sub` (claim estándar de JWT); es lo
    // único que JwtStrategy necesita para volver a buscar la cuenta.
    const access_token = await this.jwtService.signAsync({
      sub: credenciales.id,
    });

    // decode() NO verifica el token: solo lo "lee".
    // Es seguro aquí porque lo acabamos de firmar nosotros mismos.
    const payload = this.jwtService.decode<{ iat: number; exp: number }>(
      access_token,
    );

    return {
      access_token,
      token_type: 'Bearer' as const,
      expires_in: payload.exp - payload.iat,
    };
  }
}
