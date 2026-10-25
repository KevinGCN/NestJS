/**
 * Servicio del catálogo de tatuadores.
 * Una fila en `empleados` convierte al usuario en tatuador visible en el sitio;
 * el nivel de permiso es otra cosa (`usuarios.rol`), así que este servicio no
 * toca los roles: eso es exclusivo de `UsuariosService.cambiarRol`.
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmpleadoDto } from './dto/create-empleado.dto';
import { UpdateEmpleadoDto } from './dto/update-empleado.dto';

// Nunca devolver password_hash al cliente.
// Se usa `omit` (no `select`) para no repetir la lista de columnas; el precio
// es que cualquier columna nueva de `usuarios` se publicaría sola, así que si
// algún día se añade otro dato sensible hay que pasarse a un select explícito.
const usuarioSeguro = { omit: { password_hash: true } } as const;

/**
 * CRUD del catálogo de tatuadores. No valida roles ni permisos: eso vive en
 * `auth/` (guards) y en `UsuariosService`.
 */
@Injectable()
export class EmpleadosService {
  constructor(private readonly prisma: PrismaService) {}

  // `usuario_id` es @unique en la BD: un usuario solo puede tener una fila de
  // empleado y un segundo intento falla con P2002 (500). Ojo: este método NO
  // cambia el rol; para ser tatuador de verdad hacen falta la fila Y el rol.
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

  // Borra la fila del catálogo, NO el usuario. Las FK de `citas` y
  // `horarios_trabajador` son obligatorias (Restrict), así que si el tatuador
  // ya tiene agenda esto falla con error de FK: para retirarlo sin perder
  // historial hay que usar PATCH con `activo: false`.
  async eliminar(id: number) {
    await this.obtenerUno(id);

    return this.prisma.empleados.delete({
      where: { id },
    });
  }
}