
/**
 * Lógica de negocio de usuarios.
 * Toda consulta pasa por un select explícito (`usuarioSeguro`) para que el
 * `password_hash` nunca salga del backend: la única lectura que lo pide es
 * `findCredentialsByEmail`, de uso interno de Auth.
 */
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { PrismaService } from '../prisma/prisma.service';
import { ImagenesService } from '../imagenes/imagenes.service';
import { hashPassword } from '../auth/password';
import { RolUsuario } from '../generated/prisma/enums';

// Selección segura compartida: jamás exponer password_hash en las respuestas.
const usuarioSeguro = {
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
        select: usuarioSeguro,
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
      select: usuarioSeguro,
    });
  }

  // Obtener un usuario por su ID sin exponer la contraseña
  async obtenerUno(id: number) {
    const usuario = await this.prisma.usuarios.findUnique({
      where: { id },
      select: usuarioSeguro,
    });

    if (!usuario) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    return usuario;
  }

  // Actualizar los datos de un usuario
  async actualizar(id: number, datos: UpdateUsuarioDto) {
    await this.obtenerUno(id);

    // `password` se separa del resto porque no es una columna: si viajara en
    // `...resto`, Prisma fallaría. Solo se guarda ya cifrado en `password_hash`.
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
      select: usuarioSeguro,
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
      select: usuarioSeguro,
    });

    await this.imagenesService.eliminarPorUrl(anterior.foto_perfil_url);

    return usuario;
  }

  // Eliminar un usuario
  async eliminar(id: number) {
    const usuario = await this.obtenerUno(id);

    const eliminado = await this.prisma.usuarios.delete({
      where: { id },
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
      // Mismo conjunto seguro que el resto del módulo: incluye los campos
      // de perfil (telefono, foto_perfil_url) pero nunca password_hash.
      select: usuarioSeguro,
    });
  }
}
