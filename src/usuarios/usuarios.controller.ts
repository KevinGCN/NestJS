import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsuariosService } from './usuarios.service';
import { ImagenesService } from '../imagenes/imagenes.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { CambiarRolDto } from './dto/cambiar-rol.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { IMAGEN_MAX_BYTES } from '../common/imagenes';
import { SesionUsuario } from '../common/sesion';

/**
 * Endpoints REST de usuarios (`/api/usuarios`).
 * Regla de oro: ninguna respuesta puede llevar `password_hash`. Eso NO se
 * resuelve aquí sino en `UsuariosService` (selects seguros), así que cualquier
 * método nuevo debe pasar por el servicio en lugar de consultar Prisma directo.
 * El registro es público; leer/modificar exige JWT (cada uno su perfil, el admin
 * cualquiera) y el rol es exclusivo de admin.
 */
@Controller('usuarios')
export class UsuariosController {
  constructor(
    private readonly usuariosService: UsuariosService,
    private readonly imagenesService: ImagenesService,
  ) {}

  // Registro de usuarios: público a propósito (es el alta desde el sitio).
  @Post()
  crear(@Body() createUsuarioDto: CreateUsuarioDto) {
    return this.usuariosService.crear(createUsuarioDto);
  }

  // Listar usuarios es solo de admin: la pantalla que lo usa es el panel de
  // trabajadores (promover a tatuador), no una vista pública.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get()
  obtenerTodos() {
    return this.usuariosService.obtenerTodos();
  }

  // Cada usuario puede ver su propio perfil; el admin, cualquiera.
  // Es segura porque el servicio proyecta un select explícito: si algún día se
  // añade una columna sensible, hay que decidir a mano si se publica.
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  obtenerUno(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: { user: SesionUsuario },
  ) {
    if (req.user.id !== id && req.user.rol !== 'admin') {
      throw new ForbiddenException(
        'No tienes permiso para consultar este usuario',
      );
    }

    return this.usuariosService.obtenerUno(id);
  }

  // Modificar y borrar usuarios requiere sesión (JWT).
  // `UpdateUsuarioDto` NO incluye `rol` a propósito: si lo incluyera, cualquier
  // usuario logueado podría mandar {"rol":"admin"} y auto-promocionarse.
  // El rol solo se cambia por PATCH /:id/rol (ver más abajo).
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUsuarioDto: UpdateUsuarioDto,
    @Req() req: { user: SesionUsuario },
  ) {
    if (req.user.id !== id && req.user.rol !== 'admin') {
      throw new ForbiddenException(
        'No tienes permiso para modificar este usuario',
      );
    }

    return this.usuariosService.actualizar(id, updateUsuarioDto);
  }

  /**
   * Subir la foto de perfil (multipart/form-data, campo "imagen").
   * El binario se guarda en la base de datos y `foto_perfil_url` queda con
   * la ruta "/api/imagenes/<id>". Sólo el propio usuario o un admin pueden.
   */
  @UseGuards(JwtAuthGuard)
  @Post(':id/foto')
  @UseInterceptors(
    FileInterceptor('imagen', { limits: { fileSize: IMAGEN_MAX_BYTES } }),
  )
  async subirFoto(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() archivo: Express.Multer.File | undefined,
    @Req() req: { user?: SesionUsuario },
  ) {
    if (!archivo) {
      throw new BadRequestException('Falta el archivo "imagen"');
    }

    const sesion = req.user;
    if (!sesion || (sesion.id !== id && sesion.rol !== 'admin')) {
      throw new ForbiddenException(
        'Sólo puedes cambiar tu propia foto (o ser administrador).',
      );
    }

    const imagen = await this.imagenesService.guardar(archivo);
    return this.usuariosService.actualizarFoto(id, imagen.url);
  }

  // Cambiar el rol de un usuario. Exclusivo de admins (RolesGuard).
  // Un 'cliente' no puede auto-elevarse: el guard responde 403.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Patch(':id/rol')
  cambiarRol(
    @Param('id', ParseIntPipe) id: number,
    @Body() cambiarRolDto: CambiarRolDto,
  ) {
    return this.usuariosService.cambiarRol(id, cambiarRolDto.rol);
  }

  // Borrar es solo de admin. Al borrar el usuario también se borra su foto
  // (ImagenesService). Los tokens emitidos antes del DELETE dejan de servir:
  // JwtStrategy revalida que el usuario exista y responde 401 "Sesión inválida".
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Delete(':id')
  eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.usuariosService.eliminar(id);
  }
}
