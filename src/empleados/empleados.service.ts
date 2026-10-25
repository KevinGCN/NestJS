/**
 * Servicio del catálogo de tatuadores.
 * Una fila en `empleados` convierte al usuario en tatuador visible en el sitio;
 * el nivel de permiso es otra cosa (`usuarios.rol`), así que este servicio no
 * toca los roles: eso es exclusivo de `UsuariosService.cambiarRol`.
 */
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmpleadoDto } from './dto/create-empleado.dto';
import { UpdateEmpleadoDto } from './dto/update-empleado.dto';

// Solo campos públicos del usuario: nunca password_hash, email ni teléfono.
// Es un `select` explícito a propósito: así una columna nueva de `usuarios` NO
// se publica sola; hay que añadirla aquí a mano si de verdad es pública.
const usuarioSeguro = {
  select: { id: true, nombre: true, apellido: true, foto_perfil_url: true },
} as const;

/**
 * CRUD del catálogo de tatuadores. No valida roles ni permisos: eso vive en
 * `auth/` (guards) y en `UsuariosService`.
 */
@Injectable()
export class EmpleadosService {
  constructor(private readonly prisma: PrismaService) {}

  // `usuario_id` es @unique en la BD: un usuario solo puede tener una fila de
  // empleado. El duplicado (P2002) se traduce a 409 y un usuario inexistente a
  // 404, en vez de dejar que Postgres reviente con un 500 opaco.
  // Ojo: este método NO cambia el rol; para ser tatuador de verdad hacen falta
  // la fila Y el rol.
  async crear(createEmpleadoDto: CreateEmpleadoDto) {
    const usuario = await this.prisma.usuarios.findUnique({
      where: { id: createEmpleadoDto.usuario_id },
    });
    if (!usuario) {
      throw new NotFoundException(
        `Usuario con ID ${createEmpleadoDto.usuario_id} no encontrado`,
      );
    }

    try {
      return await this.prisma.empleados.create({
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
    } catch (e) {
      if ((e as { code?: string })?.code === 'P2002') {
        throw new ConflictException(
          `El usuario ${createEmpleadoDto.usuario_id} ya tiene ficha de tatuador`,
        );
      }
      throw e;
    }
  }

  async obtenerTodos() {
    // `include` conserva los campos del empleado y añade sus relaciones.
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
  // ya tiene agenda esto falla con error de FK (P2003): se traduce a 409 con la
  // alternativa correcta (`activo: false`), que retira del catálogo sin perder
  // el historial.
  async eliminar(id: number) {
    await this.obtenerUno(id);

    try {
      return await this.prisma.empleados.delete({
        where: { id },
      });
    } catch (e) {
      if ((e as { code?: string })?.code === 'P2003') {
        throw new ConflictException(
          'El tatuador tiene citas u horarios asociados: desactívalo con "activo: false" en vez de borrarlo',
        );
      }
      throw e;
    }
  }
}
