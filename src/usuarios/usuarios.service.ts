import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { PrismaService } from '../prisma/prisma.service';
import { hashPassword } from '../auth/password';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';

// Campos públicos del usuario: no incluye password_hash.
const USUARIO_SELECT = {
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
} as const;

@Injectable()
export class UsuariosService {
  constructor(private readonly prisma: PrismaService) {}

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
      select: USUARIO_SELECT,
    });
  }

  async obtenerTodos() {
    return this.prisma.usuarios.findMany({
      select: USUARIO_SELECT,
    });
  }

  async obtenerUno(id: number) {
    const usuario = await this.prisma.usuarios.findUnique({
      where: { id },
      select: USUARIO_SELECT,
    });

    if (!usuario) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    return usuario;
  }

  async actualizar(id: number, datos: UpdateUsuarioDto) {
  await this.obtenerUno(id);

  const data: {
    nombre?: string;
    apellido?: string;
    email?: string;
    telefono?: string;
    foto_perfil_url?: string;
    password_hash?: string;
    fecha_actualizacion: Date;
  } = {
    fecha_actualizacion: new Date(),
  };

  if (datos.nombre !== undefined) data.nombre = datos.nombre;
  if (datos.apellido !== undefined) data.apellido = datos.apellido;
  if (datos.email !== undefined) data.email = datos.email;
  if (datos.telefono !== undefined) data.telefono = datos.telefono;
  if (datos.foto_perfil_url !== undefined) {
    data.foto_perfil_url = datos.foto_perfil_url;
  }

  if (datos.password !== undefined) {
    data.password_hash = await hashPassword(datos.password);
  }

  return this.prisma.usuarios.update({
    where: { id },
    data,
    select: USUARIO_SELECT,
  });
}

  async eliminar(id: number) {
    await this.obtenerUno(id);

    return this.prisma.usuarios.delete({
      where: { id },
      select: USUARIO_SELECT,
    });
  }

  // Consulta interna para Auth: necesita el hash para verificar el login.
    async findCredentialsByEmail(email: string) {
    return this.prisma.usuarios.findUnique({
      where: { email },
      select: {
        id: true,
        password_hash: true,
        activo: true,
      },
    });
  }

  // Consulta para /auth/me: devuelve datos públicos, sin password_hash.
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