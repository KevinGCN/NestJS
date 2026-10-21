import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { ImagenesService } from './imagenes.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { IMAGEN_MAX_BYTES } from '../common/imagenes';

/**
 * Imágenes almacenadas en la base de datos.
 *
 *  POST   /api/imagenes        → sube un archivo (multipart, campo "imagen")
 *  GET    /api/imagenes        → lista metadatos (JWT)
 *  GET    /api/imagenes/:id    → devuelve el binario (público, es la URL de la imagen)
 *  DELETE /api/imagenes/:id    → elimina la imagen (JWT)
 */
@Controller('imagenes')
export class ImagenesController {
  constructor(private readonly imagenesService: ImagenesService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @UseInterceptors(
    FileInterceptor('imagen', { limits: { fileSize: IMAGEN_MAX_BYTES } }),
  )
  async subir(@UploadedFile() archivo?: Express.Multer.File) {
    if (!archivo) {
      throw new BadRequestException('Falta el archivo "imagen"');
    }
    return this.imagenesService.guardar(archivo);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  listar() {
    return this.imagenesService.listar();
  }

  // Público: es la URL que se guarda en galeria.imagen_url y
  // usuarios.foto_perfil_url, y el <img> del navegador la carga sin token.
  @Get(':id')
  async ver(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    const imagen = await this.imagenesService.obtener(id);

    res.setHeader('Content-Type', imagen.mime_type);
    res.setHeader('Content-Length', String(imagen.tamano));
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Content-Disposition', `inline; filename="${imagen.nombre}"`);
    return res.send(Buffer.from(imagen.data));
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.imagenesService.eliminar(id);
  }
}
