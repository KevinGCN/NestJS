/**
 * Módulo de autenticación: registra `JwtModule` (firma/verificación del token),
 * la estrategia de Passport y expone `POST /api/auth/login` + `GET /api/auth/me`.
 *
 * Importa `UsuariosModule` porque tanto `AuthService` (login) como `JwtStrategy`
 * (validar que la cuenta sigue existiendo) necesitan `UsuariosService`.
 */

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { jwtConfig } from './auth.config';

@Module({
  imports: [
    UsuariosModule,
    PassportModule,
    // El secreto y la caducidad se leen una sola vez, al cargar el módulo:
    // `jwtConfig` lanza si falta JWT_SECRET, así que el API no arranca mal
    // configurado. HS256 es suficiente aquí porque el token lo firma y lo
    // verifica el mismo backend (no hay federación de identidades).
    JwtModule.register({
      secret: jwtConfig.secret,
      signOptions: {
        expiresIn: jwtConfig.expiresIn,
        algorithm: 'HS256',
      },
    }),
  ],
  controllers: [AuthController],
  // JwtStrategy debe estar registrada como provider para que Passport conozca
  // la estrategia llamada 'jwt' (es la que usa JwtAuthGuard).
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
