import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmpleadoDto } from './dto/create-empleado.dto';
import { UpdateEmpleadoDto } from './dto/update-empleado.dto';

@Injectable()
export class EmpleadosService {
  constructor(private readonly prisma: PrismaService) {}

  async crear(createEmpleadoDto: CreateEmpleadoDto) {
    return this.prisma.empleados.create({
      data: {
        usuario_id: createEmpleadoDto.usuario_id,
        especialidad: createEmpleadoDto.especialidad,
        biografia: createEmpleadoDto.biografia,
        activo: createEmpleadoDto.activo ?? true,
      },
      include: {
        usuarios: true,
      },
    });
  }

  async obtenerTodos() {
    return this.prisma.empleados.findMany({
      include: {
        usuarios: true,
        galeria: true,
      },
    });
  }

  async obtenerUno(id: number) {
    const empleado = await this.prisma.empleados.findUnique({
      where: { id },
      include: {
        usuarios: true,
        galeria: true,
      },
    });

    if (!empleado) {
      throw new NotFoundException(`Empleado con ID ${id} no encontrado`);
    }

    return empleado;
  }

  async actualizar(id: number, updateEmpleadoDto: UpdateEmpleadoDto) {
    await this.obtenerUno(id);

    return this.prisma.empleados.update({
      where: { id },
      data: updateEmpleadoDto,
      include: {
        usuarios: true,
      },
    });
  }

  async eliminar(id: number) {
    await this.obtenerUno(id);

    return this.prisma.empleados.delete({
      where: { id },
    });
  }
}