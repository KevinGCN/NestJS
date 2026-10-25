import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { GaleriaService } from './galeria.service';
import { ImagenesService } from '../imagenes/imagenes.service';
import { CreateGaleriaDto } from './dto/create-galeria.dto';
import { UpdateGaleriaDto } from './dto/update-galeria.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { IMAGEN_MAX_BYTES } from '../common/imagenes';

/**
 * Endpoints REST de la galería (`/api/galeria`).
 * Subir una foto son DOS pasos: primero `POST /upload` guarda el binario en la
 * BD y devuelve `{ url: "/api/imagenes/<id>" }`; después `POST /api/galeria`
 * registra los metadatos con esa url. Así la fila de `galeria` solo guarda una
 * ruta relativa, que sigue siendo válida en cualquier host.
 * Consultar es público; escribir es solo de admin.
 */
@Controller('galeria')
export class GaleriaController {
  constructor(
    private readonly galeriaService: GaleriaService,
    private readonly imagenesService: ImagenesService,
  ) {}

  // Subida de archivos (multipart/form-data, campo "imagen").
  // El binario se guarda en la base de datos (tabla `imagenes`) y se devuelve
  // la ruta pública "/api/imagenes/<id>" para registrarla en POST /api/galeria.
  // Solo admin: es el único rol que puede publicar en la galería.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('imagen', { limits: { fileSize: IMAGEN_MAX_BYTES } }),
  )
  async subirImagen(@UploadedFile() archivo?: Express.Multer.File) {
    if (!archivo) {
      throw new BadRequestException('Falta el archivo "imagen"');
    }
    const imagen = await this.imagenesService.guardar(archivo);
    return { url: imagen.url, id: imagen.id };
  }

  // Crear/Modificar/Borrar imágenes es exclusivo de admin; consultar es público.
  // `imagen_url` debe ser la ruta que devolvió /upload (IsImagenUrl la valida),
  // no un archivo: aquí no se sube nada, solo se registran los metadatos.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post()
  crear(@Body() createGaleriaDto: CreateGaleriaDto) {
    return this.galeriaService.crear(createGaleriaDto);
  }

  @Get()
  obtenerTodos() {
    return this.galeriaService.obtenerTodos();
  }

  @Get(':id')
  obtenerUno(@Param('id', ParseIntPipe) id: number) {
    return this.galeriaService.obtenerUno(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Patch(':id')
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateGaleriaDto: UpdateGaleriaDto,
  ) {
    return this.galeriaService.actualizar(id, updateGaleriaDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Delete(':id')
  eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.galeriaService.eliminar(id);
  }
}
