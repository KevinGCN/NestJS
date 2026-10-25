/**
 * Galería de tatuajes: metadatos + binario.
 * La fila (`galeria.imagen_url`) guarda una ruta relativa
 * "/api/imagenes/<id>"; el archivo está en `proyecto7.imagenes`. Por eso borrar
 * una entrada tiene que borrar también el binario: si no, quedaría huérfano.
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ImagenesService } from '../imagenes/imagenes.service';
import { CreateGaleriaDto } from './dto/create-galeria.dto';
import { UpdateGaleriaDto } from './dto/update-galeria.dto';

// Solo campos públicos del usuario: nunca password_hash, email ni teléfono.
const usuarioSeguro = { select: { id: true, nombre: true, apellido: true, foto_perfil_url: true } } as const;

const relaciones = {
  usuarios: usuarioSeguro,
  // Incluye el usuario del tatuador para mostrar su nombre en la galería.
  empleados: { include: { usuarios: usuarioSeguro } },
} as const;

@Injectable()
export class GaleriaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly imagenesService: ImagenesService,
  ) {}

  // Solo se insertan metadatos: aquí NO se valida que `subido_por` o
  // `empleado_id` existan, eso lo impone la FK de Postgres (un id inventado
  // termina en error de FK, no en un 404 explicativo).
  async crear(createGaleriaDto: CreateGaleriaDto) {
    return this.prisma.galeria.create({
      data: {
        subido_por: createGaleriaDto.subido_por,
        empleado_id: createGaleriaDto.empleado_id,
        imagen_url: createGaleriaDto.imagen_url,
        titulo: createGaleriaDto.titulo,
        descripcion: createGaleriaDto.descripcion,
        estilo: createGaleriaDto.estilo,
      },
      include: relaciones,
    });
  }

  // Orden descendente por fecha: el feed muestra primero lo más reciente.
  async obtenerTodos() {
    return this.prisma.galeria.findMany({
      include: relaciones,
      orderBy: { fecha_subida: 'desc' },
    });
  }

  async obtenerUno(id: number) {
    const tatuaje = await this.prisma.galeria.findUnique({
      where: { id },
      include: relaciones,
    });

    if (!tatuaje) {
      throw new NotFoundException(`Tatuaje con ID ${id} no encontrado`);
    }

    return tatuaje;
  }

  async actualizar(id: number, updateGaleriaDto: UpdateGaleriaDto) {
    await this.obtenerUno(id);

    return this.prisma.galeria.update({
      where: { id },
      data: updateGaleriaDto,
      include: relaciones,
    });
  }

  async eliminar(id: number) {
    const tatuaje = await this.obtenerUno(id);

    const eliminado = await this.prisma.galeria.delete({
      where: { id },
    });

    // La imagen vive en la BD (o en el disco con el flujo legacy): hay que
    // borrar el binario para no dejar archivos huérfanos.
    // `eliminarPorUrl` entiende tanto "/api/imagenes/<id>" como "/uploads/<f>".
    await this.imagenesService.eliminarPorUrl(tatuaje.imagen_url);

    return eliminado;
  }
}
