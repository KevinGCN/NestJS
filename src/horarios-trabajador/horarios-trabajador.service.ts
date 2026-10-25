/**
 * Horarios semanales de los tatuadores.
 * Fechas y horas pasan por `aMinutos`/`horaADate` de `common/fechas.ts`: las
 * columnas son `@db.Time` y `horaADate` fija el día 1970-01-01 en UTC, de modo
 * que la hora se guarda tal cual sin depender de la zona del servidor
 * (`APP_TIMEZONE`, por defecto America/Bogota).
 */
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SesionUsuario } from '../common/sesion';
import { aMinutos, horaADate } from '../common/fechas';
import { CreateHorarioDto } from './dto/create-horario.dto';
import { UpdateHorarioDto } from './dto/update-horario.dto';

// Solo campos públicos del usuario: nunca password_hash, email ni teléfono.
// Es el mismo select que usan `empleados` y `galeria`; `omit` exponía los datos
// de contacto del tatuador en un listado que es público.
const usuarioSeguro = {
  select: { id: true, nombre: true, apellido: true, foto_perfil_url: true },
} as const;

const relaciones = {
  empleados: { include: { usuarios: usuarioSeguro } },
} as const;

/** Valida franjas semanales; solo detecta el duplicado exacto, no solapamientos. */
@Injectable()
export class HorariosTrabajadorService {
  constructor(private readonly prisma: PrismaService) {}

  private esAdmin(sesion?: SesionUsuario) {
    return sesion?.rol === 'admin';
  }

  /**
   * Autorización por recurso: el guard solo ve el JWT, así que aquí se decide
   * si la franja pertenece al usuario. Puede gestionarla el tatuador dueño de la
   * ficha (`empleados.usuario_id`) y cualquier admin; el resto recibe 403.
   */
  private exigirPuedeGestionarEmpleado(
    usuarioDueno: number,
    sesion?: SesionUsuario,
  ) {
    if (this.esAdmin(sesion)) return;
    if (sesion?.id !== usuarioDueno) {
      throw new ForbiddenException(
        'No tienes permiso para gestionar los horarios de este tatuador',
      );
    }
  }

  // Compara en minutos ("9:00" > "10:00" en orden alfabético) y también rechaza
  // inicio == fin: una franja de duración cero no sirve para agendar.
  private validarHoras(hora_inicio: string, hora_fin: string) {
    if (aMinutos(hora_fin) <= aMinutos(hora_inicio)) {
      throw new BadRequestException(
        'hora_fin debe ser posterior a hora_inicio',
      );
    }
  }

  // Traduce los errores de unicidad de Postgres a 409.
  // El índice único es (empleado_id, dia_semana, hora_inicio): corta el duplicado
  // exacto, pero NO detecta dos franjas solapadas del mismo día. Ese caso pasa.
  private manejarErrorPrisma(e: unknown) {
    if ((e as { code?: string })?.code === 'P2002') {
      throw new ConflictException(
        'Ya existe un horario para ese empleado, día y hora de inicio',
      );
    }
    throw e;
  }

  // Se comprueba el empleado antes de insertar para responder 404 con mensaje
  // claro; si no, la FK de Postgres daría un 500 opaco.
  async crear(createHorarioDto: CreateHorarioDto, sesion?: SesionUsuario) {
    this.validarHoras(createHorarioDto.hora_inicio, createHorarioDto.hora_fin);

    const empleado = await this.prisma.empleados.findUnique({
      where: { id: createHorarioDto.empleado_id },
    });
    if (!empleado) {
      throw new NotFoundException(
        `Empleado con ID ${createHorarioDto.empleado_id} no encontrado`,
      );
    }
    this.exigirPuedeGestionarEmpleado(empleado.usuario_id, sesion);

    try {
      return await this.prisma.horarios_trabajador.create({
        data: {
          empleado_id: createHorarioDto.empleado_id,
          dia_semana: createHorarioDto.dia_semana,
          hora_inicio: horaADate(createHorarioDto.hora_inicio),
          hora_fin: horaADate(createHorarioDto.hora_fin),
        },
        include: relaciones,
      });
    } catch (e) {
      this.manejarErrorPrisma(e);
    }
  }

  // Filtrable por ?empleado_id= (agenda semanal de un tatuador).
  async obtenerTodos(filtros: { empleado_id?: number }) {
    return this.prisma.horarios_trabajador.findMany({
      where: filtros.empleado_id ? { empleado_id: filtros.empleado_id } : {},
      include: relaciones,
      orderBy: [{ dia_semana: 'asc' }, { hora_inicio: 'asc' }],
    });
  }

  async obtenerUno(id: number) {
    const horario = await this.prisma.horarios_trabajador.findUnique({
      where: { id },
      include: relaciones,
    });

    if (!horario) {
      throw new NotFoundException(`Horario con ID ${id} no encontrado`);
    }

    return horario;
  }

  async actualizar(
    id: number,
    updateHorarioDto: UpdateHorarioDto,
    sesion?: SesionUsuario,
  ) {
    const horario = await this.obtenerUno(id);
    this.exigirPuedeGestionarEmpleado(horario.empleados.usuario_id, sesion);

    // Mover la franja a otro tatuador también exige ser el dueño del destino
    // (o admin): si no, cualquiera podría escribir horarios en la agenda ajena.
    if (
      updateHorarioDto.empleado_id !== undefined &&
      updateHorarioDto.empleado_id !== horario.empleado_id
    ) {
      const destino = await this.prisma.empleados.findUnique({
        where: { id: updateHorarioDto.empleado_id },
      });
      if (!destino) {
        throw new NotFoundException(
          `Empleado con ID ${updateHorarioDto.empleado_id} no encontrado`,
        );
      }
      this.exigirPuedeGestionarEmpleado(destino.usuario_id, sesion);
    }

    // Se completa cada campo con lo que ya estaba guardado: así se puede
    // revalidar el rango completo aunque el PATCH mande solo una de las horas
    // (validar únicamente lo enviado dejaría pasar combinaciones imposibles).
    const empleado_id = updateHorarioDto.empleado_id ?? horario.empleado_id;
    const dia_semana = updateHorarioDto.dia_semana ?? horario.dia_semana;
    const hora_inicio =
      updateHorarioDto.hora_inicio ?? this.horaDe(horario.hora_inicio);
    const hora_fin = updateHorarioDto.hora_fin ?? this.horaDe(horario.hora_fin);

    this.validarHoras(hora_inicio, hora_fin);

    try {
      return await this.prisma.horarios_trabajador.update({
        where: { id },
        data: {
          empleado_id,
          dia_semana,
          hora_inicio: horaADate(hora_inicio),
          hora_fin: horaADate(hora_fin),
        },
        include: relaciones,
      });
    } catch (e) {
      this.manejarErrorPrisma(e);
    }
  }

  async eliminar(id: number, sesion?: SesionUsuario) {
    const horario = await this.obtenerUno(id);
    this.exigirPuedeGestionarEmpleado(horario.empleados.usuario_id, sesion);

    return this.prisma.horarios_trabajador.delete({
      where: { id },
      include: relaciones,
    });
  }

  // Convierte un DateTime de Prisma (columna @db.Time) a "HH:mm".
  private horaDe(d: Date) {
    return d.toISOString().slice(11, 16);
  }
}
