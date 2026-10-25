
import { Module } from '@nestjs/common';
import { ImagenesModule } from '../imagenes/imagenes.module';
import { UsuariosController } from './usuarios.controller';
import { UsuariosService } from './usuarios.service';
import { RolesGuard } from '../auth/roles.guard';

/**
 * Módulo de usuarios: CRUD, cambio de rol y foto de perfil.
 * Provee `UsuariosService` y lo exporta porque `AuthModule` lo consume para
 * validar credenciales (`findCredentialsByEmail`) y restaurar la sesión en
 * `GET /api/auth/me` (`obtenerPublicoOrNull`).
 * Importa `ImagenesModule` porque la foto de perfil se guarda como binario en
 * la base de datos y su borrado pasa por `ImagenesService`.
 */
@Module({
  imports: [ImagenesModule],
  controllers: [UsuariosController],
  providers: [UsuariosService, RolesGuard],
  exports: [UsuariosService],
})
export class UsuariosModule {}
