import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { PrismaService } from '../prisma/prisma.service';
import { hashPassword } from '../auth/password';

@Injectable()
export class UsuariosService {
  constructor(private readonly prisma: PrismaService) { }

  async crear(createUsuarioDto: CreateUsuarioDto) {
    const passwordHash = await hashPassword(createUsuarioDto.password);

    return this.prisma.usuarios.create({
      data: {
        nombre: createUsuarioDto.nombre,
        apellido: createUsuarioDto.apellido,
        email: createUsuarioDto.email,
        password_hash: createUsuarioDto.password,
        telefono: createUsuarioDto.telefono,
        foto_perfil_url: createUsuarioDto.foto_perfil_url,
        fecha_actualizacion: new Date(),
      },
      select: {
        id: true,
        nombre: true,
        apellido: true,
        email: true,
        telefono: true,
        foto_perfil_url: true,
        rol: true,
        activo: true,
        fecha_registro: true,
        fecha_actualizacion: true,
      },
    });
  }

  async obtenerTodos() {
    return this.prisma.usuarios.findMany({
      select: {
        id: true,
        nombre: true,
        apellido: true,
        email: true,
        telefono: true,
        foto_perfil_url: true,
        rol: true,
        activo: true,
        fecha_registro: true,
        fecha_actualizacion: true,
      },
    });
  }

  async obtenerUno(id: number) {
    const usuario = await this.prisma.usuarios.findUnique({
      where: { id },
      select: {
        id: true,
        nombre: true,
        apellido: true,
        email: true,
        telefono: true,
        foto_perfil_url: true,
        rol: true,
        activo: true,
        fecha_registro: true,
        fecha_actualizacion: true,
      },
    });

    if (!usuario) {
      throw new NotFoundException(
        `Usuario con ID ${id} no encontrado`,
      );
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
      select: {
        id: true,
        nombre: true,
        apellido: true,
        email: true,
        telefono: true,
        foto_perfil_url: true,
        rol: true,
        activo: true,
        fecha_registro: true,
        fecha_actualizacion: true,
      },
    });
  }

  async eliminar(id: number) {
    await this.obtenerUno(id);

    return this.prisma.usuarios.delete({
      where: { id },
      select: {
        id: true,
        nombre: true,
        apellido: true,
        email: true,
        telefono: true,
        foto_perfil_url: true,
        rol: true,
        activo: true,
        fecha_registro: true,
        fecha_actualizacion: true,
      },
    });
  }

  async findCredentialsByEmail(email: string) {
    return this.prisma.usuarios.findUnique({
      where: {
        email,
      },

      select: {
        id: true,
        password_hash: true,
      },
    });
  }
}