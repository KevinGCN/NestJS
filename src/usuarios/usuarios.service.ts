import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsuariosService {
  constructor(private readonly prisma: PrismaService) {}

  async crear(createUsuarioDto: CreateUsuarioDto) {
    return this.prisma.usuarios.create({
      data: {
        nombre: createUsuarioDto.nombre,
        apellido: createUsuarioDto.apellido,
        email: createUsuarioDto.email,
        password_hash: createUsuarioDto.password_hash,
        telefono: createUsuarioDto.telefono,
        foto_perfil_url: createUsuarioDto.foto_perfil_url,
        fecha_actualizacion: new Date(),
      },
    });
  }

  async obtenerTodos() {
    return this.prisma.usuarios.findMany();
  }

  async obtenerUno(id: number) {
    const usuario = await this.prisma.usuarios.findUnique({
      where: { id },
    });

    if (!usuario) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    return usuario;
  }

  async actualizar(id: number, datos: any) {
    await this.obtenerUno(id);

    return this.prisma.usuarios.update({
      where: { id },
      data: {
        ...datos,
        fecha_actualizacion: new Date(),
      },
    });
  }

  async eliminar(id: number) {
    await this.obtenerUno(id);

    return this.prisma.usuarios.delete({
      where: { id },
    });
  }
}