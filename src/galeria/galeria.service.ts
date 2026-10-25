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
const usuarioSeguro = {
  select: { id: true, nombre: true, apellido: true, foto_perfil_url: true },
} as const;

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

  // Comprueba las FK antes de escribir para responder 404 con un mensaje útil.
  // Si se deja a Postgres, un id inventado termina en error de FK (P2003) que
  // Nest devuelve como 500 opaco.
  private async verificarRelaciones(subido_por: number, empleado_id?: number) {
    const usuario = await this.prisma.usuarios.findUnique({
      where: { id: subido_por },
    });
    if (!usuario) {
      throw new NotFoundException(`Usuario con ID ${subido_por} no encontrado`);
    }

    if (empleado_id !== undefined) {
      const empleado = await this.prisma.empleados.findUnique({
        where: { id: empleado_id },
      });
      if (!empleado) {
        throw new NotFoundException(
          `Empleado con ID ${empleado_id} no encontrado`,
        );
      }
    }
  }

  // Solo se insertan metadatos: aquí NO se sube ningún archivo. Las FK se
  // validan a mano (arriba) para que un id inexistente sea 404.
  async crear(createGaleriaDto: CreateGaleriaDto) {
    await this.verificarRelaciones(
      createGaleriaDto.subido_por,
      createGaleriaDto.empleado_id,
    );

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
    const tatuaje = await this.obtenerUno(id);

    // Solo se consultan las FK si el PATCH toca alguna de las dos; si no, el
    // valor que completa el par ya estaba validado al crear la fila.
    if (
      updateGaleriaDto.subido_por !== undefined ||
      updateGaleriaDto.empleado_id !== undefined
    ) {
      await this.verificarRelaciones(
        updateGaleriaDto.subido_por ?? tatuaje.subido_por,
        updateGaleriaDto.empleado_id ?? tatuaje.empleado_id ?? undefined,
      );
    }

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
