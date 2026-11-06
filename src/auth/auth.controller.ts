/**
 * Rutas de autenticación bajo /auth.
 *
 * - `POST /auth/login` es pública (es la que emite el token).
 * - `GET /auth/me` exige JWT y sirve al frontend para restaurar la sesión
 *   al recargar: si responde 401, el interceptor limpia el token guardado.
 */

import { Controller, Post, Get, Body, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { SesionUsuario } from '../common/sesion';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** Pública. Devuelve `{ access_token, token_type, expires_in }`. */
  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  /**
   * Pública. Recibe el ID token de Firebase (login con Google) y devuelve el
   * mismo formato que `/auth/login`.
   */
  @Post('google')
  loginConGoogle(@Body() googleLoginDto: GoogleLoginDto) {
    return this.authService.loginConGoogle(googleLoginDto.idToken);
  }

  // El guard exige `Authorization: Bearer <token>` y deja el usuario en
  // `req.user`; sin token (o con uno de una cuenta borrada) responde 401.
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: { user: SesionUsuario }) {
    return req.user; // lo dejó JwtStrategy.validate()
  }
}
