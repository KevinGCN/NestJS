
import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { PrismaService } from '../prisma/prisma.service';
import { hashPassword } from '../auth/password';

@Injectable()
export class UsuariosService {
  constructor(private readonly prisma: PrismaService) {}

  // Crear un usuario y guardar su contraseña cifrada mediante hash
  async crear(createUsuarioDto: CreateUsuarioDto) {
    const password_hash = await hashPassword(createUsuarioDto.password);

    return this.prisma.usuarios.create({
      data: {
        nombre: createUsuarioDto.nombre,
        apellido: createUsuarioDto.apellido,
        email: createUsuarioDto.email,
        password_hash,
        telefono: createUsuarioDto.telefono,
        foto_perfil_url: createUsuarioDto.foto_perfil_url,
        fecha_actualizacion: new Date(),
      },
    });
  }

  // Obtener todos los usuarios
  async obtenerTodos() {
    return this.prisma.usuarios.findMany({
      select: {
        id: true,
        nombre: true,
        apellido: true,
        email: true,
        rol: true,
        activo: true,
        telefono: true,
        foto_perfil_url: true,
        fecha_registro: true,
        fecha_actualizacion: true,
      },
    });
  }

  // Obtener un usuario por su ID sin exponer la contraseña
  async obtenerUno(id: number) {
    const usuario = await this.prisma.usuarios.findUnique({
      where: { id },
      select: {
        id: true,
        nombre: true,
        apellido: true,
        email: true,
        rol: true,
        activo: true,
        telefono: true,
        foto_perfil_url: true,
        fecha_registro: true,
        fecha_actualizacion: true,
      },
    });

    if (!usuario) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    return usuario;
  }

  // Actualizar los datos de un usuario
  async actualizar(id: number, datos: UpdateUsuarioDto) {
    await this.obtenerUno(id);

    const { password, ...resto } = datos;

    return this.prisma.usuarios.update({
      where: { id },
      data: {
        ...resto,
        ...(password
          ? { password_hash: await hashPassword(password) }
          : {}),
        fecha_actualizacion: new Date(),
      },
      select: {
        id: true,
        nombre: true,
        apellido: true,
        email: true,
        rol: true,
        activo: true,
        telefono: true,
        foto_perfil_url: true,
        fecha_registro: true,
        fecha_actualizacion: true,
      },
    });
  }

  // Eliminar un usuario
  async eliminar(id: number) {
    await this.obtenerUno(id);

    return this.prisma.usuarios.delete({
      where: { id },
    });
  }

  // Consulta interna para Auth: solo obtiene los datos necesarios para validar
  // las credenciales. No debe exponerse como endpoint público.
  async findCredentialsByEmail(email: string) {
    return this.prisma.usuarios.findUnique({
      where: { email },
      select: {
        id: true,
        password_hash: true,
      },
    });
  }

  // Usada por JwtStrategy en /auth/me.
  // Devuelve null si el usuario no existe y nunca incluye la contraseña.
  async obtenerPublicoOrNull(id: number) {
    return this.prisma.usuarios.findUnique({
      where: { id },
      select: {
        id: true,
        nombre: true,
        apellido: true,
        email: true,
        rol: true,
        activo: true,
        fecha_registro: true,
        fecha_actualizacion: true,
      },
    });
  }
}
