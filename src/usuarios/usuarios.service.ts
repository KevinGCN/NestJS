import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { PrismaService } from '../prisma/prisma.service';
import { hashPassword } from '../auth/password';

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
    });
  }

  async obtenerTodos() {
    return this.prisma.usuarios.findMany();
  }

  async obtenerUno(id: number) {
    const usuario = await this.prisma.usuarios.findUnique({ where: { id } });

    if (!usuario) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    return usuario;
  }

  async actualizar(id: number, datos: UpdateUsuarioDto) {
  await this.obtenerUno(id);

  const { password, ...resto } = datos;

  return this.prisma.usuarios.update({
    where: { id },
    data: {
      ...resto,
      ...(password ? { password_hash: await hashPassword(password) } : {}),
      fecha_actualizacion: new Date(),
    },
  });
}

  async eliminar(id: number) {
    await this.obtenerUno(id);
    return this.prisma.usuarios.delete({ where: { id } });
  }

  // Consulta interna para Auth: NUNCA se expone como endpoint público
  async findCredentialsByEmail(email: string) {
    return this.prisma.usuarios.findUnique({
      where: { email },
      select: { id: true, password_hash: true },
    });
  }

  // Usada por JwtStrategy en /auth/me: devuelve null en vez de lanzar error
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
        // password_hash queda fuera a propósito
      },
    });
  }
}