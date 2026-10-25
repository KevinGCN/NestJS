/**
 * Rutas de autenticación bajo /api/auth.
 *
 * - `POST /api/auth/login` es pública (es la que emite el token).
 * - `GET /api/auth/me` exige JWT y sirve al frontend para restaurar la sesión
 *   al recargar: si responde 401, el interceptor limpia el token guardado.
 */

import { Controller, Post, Get, Body, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** Pública. Devuelve `{ access_token, token_type, expires_in }`. */
  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  // El guard exige `Authorization: Bearer <token>` y deja el usuario en
  // `req.user`; sin token (o con uno de una cuenta borrada) responde 401.
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: any) {
    return req.user; // lo dejó JwtStrategy.validate()
  }
}