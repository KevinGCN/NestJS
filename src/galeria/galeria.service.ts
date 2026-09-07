import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGaleriaDto } from './dto/create-galeria.dto';
import { UpdateGaleriaDto } from './dto/update-galeria.dto';

@Injectable()
export class GaleriaService {
  constructor(private readonly prisma: PrismaService) {}

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
      include: {
        usuarios: true,
        empleados: true,
      },
    });
  }

  async obtenerTodos() {
    return this.prisma.galeria.findMany({
      include: {
        usuarios: true,
        empleados: true,
      },
    });
  }

  async obtenerUno(id: number) {
    const tatuaje = await this.prisma.galeria.findUnique({
      where: { id },
      include: {
        usuarios: true,
        empleados: true,
      },
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
      include: {
        usuarios: true,
        empleados: true,
      },
    });
  }

  async eliminar(id: number) {
    await this.obtenerUno(id);

    return this.prisma.galeria.delete({
      where: { id },
    });
  }
}