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
import { verificarTokenFirebase, type FirebasePayload } from './firebase';

@Injectable()
export class AuthService {
  constructor(
    private readonly usuariosService: UsuariosService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * `POST /auth/login` → `{ access_token, token_type: 'Bearer', expires_in }`.
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

    return this.firmarToken(credenciales.id);
  }

  /**
   * `POST /auth/google` → mismo formato que `/auth/login`.
   *
   * Verifica el ID token que emite Firebase tras el popup de Google y devuelve
   * un JWT propio. Si el correo no existe en la base, se crea como `cliente`
   * con una contraseña aleatoria (la cuenta se usa solo con Google).
   */
  async loginConGoogle(idToken: string) {
    let payload: FirebasePayload;
    try {
      payload = await verificarTokenFirebase(
        idToken,
        process.env.FIREBASE_PROJECT_ID ?? 'ink-creature-0',
      );
    } catch {
      throw new UnauthorizedException('Token de Google inválido');
    }

    if (!payload.email || payload.email_verified !== true) {
      throw new UnauthorizedException(
        'La cuenta de Google no tiene un correo verificado',
      );
    }

    const usuario = await this.usuariosService.buscarOCrearPorEmail({
      email: payload.email,
      nombre: payload.given_name ?? payload.name ?? 'Usuario',
      apellido: payload.family_name ?? '',
      foto_perfil_url: payload.picture ?? null,
    });

    if (!usuario.activo) {
      throw new UnauthorizedException('Cuenta desactivada');
    }

    return this.firmarToken(usuario.id);
  }

  /** Firma el JWT y calcula su caducidad. Lo usan los dos tipos de login. */
  private async firmarToken(id: number) {
    // El token expone el id del usuario en `sub` (claim estándar de JWT); es lo
    // único que JwtStrategy necesita para volver a buscar la cuenta.
    const access_token = await this.jwtService.signAsync({ sub: id });

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
