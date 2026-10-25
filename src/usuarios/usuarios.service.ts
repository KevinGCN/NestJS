/**
 * Lógica de negocio de usuarios.
 * Toda consulta pública pasa por el select explícito `USUARIO_SELECT` para que
 * el `password_hash` nunca salga del backend: la única lectura que lo pide es
 * `findCredentialsByEmail`, de uso interno de Auth.
 */
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { PrismaService } from '../prisma/prisma.service';
import { ImagenesService } from '../imagenes/imagenes.service';
import { hashPassword } from '../auth/password';
import { RolUsuario } from '../generated/prisma/enums';

// Campos públicos del usuario: no incluye password_hash. Es un `select`
// explícito a propósito, para que una columna sensible nueva no se publique
// sola; si algún día hay que exponer otro campo, se añade aquí a mano.
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

/** CRUD de usuarios + rol + foto. No decide permisos: eso es de los guards. */
@Injectable()
export class UsuariosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly imagenesService: ImagenesService,
  ) {}

  // Crear un usuario y guardar su contraseña cifrada mediante hash
  async crear(createUsuarioDto: CreateUsuarioDto) {
    const password_hash = await hashPassword(createUsuarioDto.password);

    try {
      return await this.prisma.usuarios.create({
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
    } catch (e) {
      // Email único violado → 409 en vez de un 500 opaco.
      if ((e as { code?: string })?.code === 'P2002') {
        throw new ConflictException(
          `El correo ${createUsuarioDto.email} ya está registrado`,
        );
      }
      throw e;
    }
  }

  // Obtener todos los usuarios
  async obtenerTodos() {
    return this.prisma.usuarios.findMany({
      select: USUARIO_SELECT,
    });
  }

  // Obtener un usuario por su ID sin exponer la contraseña
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

  // Actualizar los datos de un usuario.
  // Se copian campo por campo (no `...datos`) para que el DTO sea el único que
  // decide qué se puede tocar: así `rol` y `activo` no pueden colarse aunque
  // alguien manipule el body.
  async actualizar(id: number, datos: UpdateUsuarioDto) {
    await this.obtenerUno(id);

    // `password` no es una columna: se transforma en `password_hash` ya cifrado
    // y solo si viene en el body.
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

  // Cambiar el rol de un usuario (solo admin - lo restringe RolesGuard).
  // El valor del rol ya lo valida `CambiarRolDto` (@IsEnum), así que aquí no se
  // revalida; el permiso es responsabilidad del guard, no del servicio.
  async cambiarRol(id: number, rol: RolUsuario) {
    await this.obtenerUno(id);

    return this.prisma.usuarios.update({
      where: { id },
      data: {
        rol,
        fecha_actualizacion: new Date(),
      },
      select: USUARIO_SELECT,
    });
  }

  /**
   * Actualiza la foto de perfil con la ruta de la imagen ya guardada
   * ("/api/imagenes/<id>") y elimina la imagen anterior para no dejar
   * binarios huérfanos en la base de datos.
   */
  async actualizarFoto(id: number, url: string) {
    const anterior = await this.obtenerUno(id);

    const usuario = await this.prisma.usuarios.update({
      where: { id },
      data: {
        foto_perfil_url: url,
        fecha_actualizacion: new Date(),
      },
      select: USUARIO_SELECT,
    });

    await this.imagenesService.eliminarPorUrl(anterior.foto_perfil_url);

    return usuario;
  }

  // Eliminar un usuario. El `select` evita que el `password_hash` viaje en la
  // respuesta del DELETE.
  async eliminar(id: number) {
    const usuario = await this.obtenerUno(id);

    const eliminado = await this.prisma.usuarios.delete({
      where: { id },
      select: USUARIO_SELECT,
    });

    // La foto de perfil es una imagen en la BD: se borra para no dejar
    // binarios huérfanos.
    await this.imagenesService.eliminarPorUrl(usuario.foto_perfil_url);

    return eliminado;
  }

  // Consulta interna para Auth: solo obtiene los datos necesarios para validar
  // las credenciales. No debe exponerse como endpoint público.
  // Es el ÚNICO punto que lee `password_hash` a propósito (lo compara el login);
  // su resultado nunca debe devolverse tal cual en una respuesta HTTP.
  // `activo` viaja aquí porque el login rechaza cuentas desactivadas.
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

  // Usada por JwtStrategy en /auth/me.
  // Devuelve null si el usuario no existe y nunca incluye la contraseña.
  async obtenerPublicoOrNull(id: number) {
    return this.prisma.usuarios.findUnique({
      where: { id },
      // Mismo conjunto seguro que el resto del módulo: incluye los campos
      // de perfil (telefono, foto_perfil_url) pero nunca password_hash.
      select: USUARIO_SELECT,
    });
  }
}
