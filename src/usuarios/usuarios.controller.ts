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
import { Roles, RolesGuard } from '../auth/roles.guard';
import { IMAGEN_MAX_BYTES } from '../common/imagenes';

/** Usuario que deja JwtStrategy en `request.user`. */
type SesionUsuario = { id: number; rol: string };

@Controller('usuarios')
export class UsuariosController {
  constructor(
    private readonly usuariosService: UsuariosService,
    private readonly imagenesService: ImagenesService,
  ) {}

  // Registro de usuarios: público a propósito.
  @Post()
  crear(@Body() createUsuarioDto: CreateUsuarioDto) {
    return this.usuariosService.crear(createUsuarioDto);
  }

  @Get()
  obtenerTodos() {
    return this.usuariosService.obtenerTodos();
  }

  @Get(':id')
  obtenerUno(@Param('id', ParseIntPipe) id: number) {
    return this.usuariosService.obtenerUno(id);
  }

  // Modificar y borrar usuarios requiere sesión (JWT).
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUsuarioDto: UpdateUsuarioDto,
  ) {
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

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.usuariosService.eliminar(id);
  }
}
