import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmpleadoDto } from './dto/create-empleado.dto';
import { UpdateEmpleadoDto } from './dto/update-empleado.dto';

// Nunca devolver password_hash al cliente.
const usuarioSeguro = { omit: { password_hash: true } } as const;

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
        usuarios: usuarioSeguro,
      },
    });
  }

  async obtenerTodos() {
    // `include` en vez de `select`: así también devuelve id, especialidad, biografia y activo.
    return this.prisma.empleados.findMany({
      include: {
        usuarios: usuarioSeguro,
        galeria: true,
      },
    });
  }

  async obtenerUno(id: number) {
    const empleado = await this.prisma.empleados.findUnique({
      where: { id },
      include: {
        usuarios: usuarioSeguro,
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
        usuarios: usuarioSeguro,
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