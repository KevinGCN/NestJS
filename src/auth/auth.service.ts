/**
 * Verifica credenciales y firma el JWT.
 *
 * El token solo lleva `sub` (id del usuario) porque el resto del perfil se
 * relee de la BD en cada request (`JwtStrategy`). Así un cambio de rol o un
 * borrado de cuenta surte efecto sin esperar a que caduque el token.
 */

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { UsuariosService } from '../usuarios/usuarios.service';
import { LoginDto } from './dto/login.dto';
import { verificarIdTokenFirebase } from './firebase-id-token';
import { verifyPassword, DUMMY_HASH } from './password';

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

    return this.emitirSesion(credenciales.id);
  }

  /**
   * `POST /auth/google`: firma la sesión propia del API a partir de una
   * identidad de Google ya verificada (Firebase ID token). El endpoint es
   * público porque el token de Google es el comprobante de identidad; el JWT
   * que se emite es exactamente el mismo que `login`.
   *
   * Si el email de Google no tiene cuenta en el API se la crea al vuelo con
   * rol `cliente` (y una contraseña aleatoria que nadie conoce: siempre
   * tendría que entrar por Google o usar "olvidé mi contraseña").
   */
  async loginGoogle(idToken: string) {
    const claims = await verificarIdTokenFirebase(idToken);

    // Un email no verificado en Firebase no debe abrir sesión: cualquiera
    // podría registrar en Google un email ajeno sin demostrar que le pertenece.
    if (!claims.email || !claims.email_verified) {
      throw new UnauthorizedException('Token de Google invalido o expirado');
    }

    const { email } = claims;
    let credenciales = await this.usuariosService.findCredentialsByEmail(email);

    if (!credenciales) {
      // Alta automática: el nombre que da Google suele ser "Nombre Apellidos".
      const partes = (claims.name ?? '').trim().split(/\s+/).filter(Boolean);
      const nombre = partes[0] ?? 'Usuario';
      const apellido = partes.slice(1).join(' ') || '-';

      const creado = await this.usuariosService.crear({
        email,
        nombre,
        apellido,
        // Contraseña imposible de adivinar: la cuenta solo se usa por Google.
        password: randomBytes(32).toString('hex'),
        foto_perfil_url: /^https:\/\//i.test(claims.picture ?? '')
          ? (claims.picture as string)
          : undefined,
      } as Parameters<typeof this.usuariosService.crear>[0]);

      credenciales = { id: (creado as { id: number }).id, password_hash: '', activo: true };
    }

    // Mismo criterio que el login con contraseña: la cuenta desactivada no
    // entra aunque su identidad de Google sea válida.
    if (!credenciales.activo) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    return this.emitirSesion(credenciales.id);
  }

  /**
   * Firma el JWT de sesión y devuelve la forma común de las dos entradas:
   * `{ access_token, token_type, expires_in }`.
   */
  private async emitirSesion(usuarioId: number) {
    // El token expone el id del usuario en `sub` (claim estándar de JWT); es lo
    // único que JwtStrategy necesita para volver a buscar la cuenta.
    const access_token = await this.jwtService.signAsync({
      sub: usuarioId,
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
