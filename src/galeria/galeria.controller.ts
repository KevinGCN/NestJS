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
import { CreateGaleriaDto } from './dto/create-galeria.dto';
import { UpdateGaleriaDto } from './dto/update-galeria.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { guardarImagen, IMAGEN_MAX_BYTES } from '../common/imagenes';

@Controller('galeria')
export class GaleriaController {
  constructor(private readonly galeriaService: GaleriaService) {}

  // Subida de archivos (multipart/form-data, campo "imagen").
  // Guarda el archivo en /uploads y devuelve la URL para registrarla
  // después en POST /api/galeria.
  @UseGuards(JwtAuthGuard)
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('imagen', { limits: { fileSize: IMAGEN_MAX_BYTES } }),
  )
  async subirImagen(@UploadedFile() archivo?: Express.Multer.File) {
    if (!archivo) {
      throw new BadRequestException('Falta el archivo "imagen"');
    }
    const url = await guardarImagen(archivo);
    return { url };
  }

  // Crear/Modificar/Borrar imágenes exige sesión (JWT); consultar es público.
  @UseGuards(JwtAuthGuard)
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

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateGaleriaDto: UpdateGaleriaDto,
  ) {
    return this.galeriaService.actualizar(id, updateGaleriaDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.galeriaService.eliminar(id);
  }
}