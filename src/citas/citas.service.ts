/**
 * Agenda: creación y mantenimiento de citas.
 * Fechas y horas se normalizan con `common/fechas.ts` antes de guardar, porque
 * el backend y el navegador pueden estar en zonas distintas: la zona de negocio
 * es `APP_TIMEZONE` (por defecto America/Bogota) y las columnas son `@db.Date`
 * y `@db.Time`, así que un `Date` mal construido desplazaría la cita un día.
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
import { aMinutos, fechaADate, horaADate } from '../common/fechas';
import { CreateCitaDto } from './dto/create-cita.dto';
import { UpdateCitaDto } from './dto/update-cita.dto';

// Solo campos públicos del usuario: nunca password_hash, email ni teléfono.
// Es el mismo select que usan `empleados` y `galeria`; `omit` exponía los datos
// de contacto del cliente y del tatuador en un listado que es público.
const usuarioSeguro = {
  select: { id: true, nombre: true, apellido: true, foto_perfil_url: true },
} as const;

// Relaciones que acompañan a toda cita: el cliente que la reservó y el
// tatuador (con su usuario, también sin hash) para poder pintar nombres.
const relaciones = {
  usuarios: usuarioSeguro,
  empleados: { include: { usuarios: usuarioSeguro } },
} as const;

/** Reglas de la agenda: rango horario válido, FK existentes y no duplicar hueco. */
@Injectable()
export class CitasService {
  constructor(private readonly prisma: PrismaService) {}

  private esAdmin(sesion?: SesionUsuario) {
    return sesion?.rol === 'admin';
  }

  /**
   * Autorización por recurso: el guard solo comprueba que hay JWT, así que aquí
   * se decide de quién es la cita. Pueden gestionarla el cliente que la reservó,
   * el tatuador que la atiende y cualquier admin; el resto recibe 403.
   */
  private exigirPuedeGestionar(
    cita: { usuario_id: number; empleados?: { usuario_id: number } | null },
    sesion?: SesionUsuario,
  ) {
    if (this.esAdmin(sesion)) return;

    const esCliente = sesion?.id === cita.usuario_id;
    const esTatuador = sesion?.id === cita.empleados?.usuario_id;

    if (!esCliente && !esTatuador) {
      throw new ForbiddenException(
        'No tienes permiso para gestionar esta cita',
      );
    }
  }

  // Se compara en minutos (no como texto: "9:00" > "10:00" en orden alfabético)
  // y también cubre el caso inicio == fin, que no es una cita válida.
  private validarHoras(hora_inicio: string, hora_fin: string) {
    if (aMinutos(hora_fin) <= aMinutos(hora_inicio)) {
      throw new BadRequestException(
        'hora_fin debe ser posterior a hora_inicio',
      );
    }
  }

  // Las FK se comprueban antes de escribir para responder 404 con un mensaje
  // útil; si se dejara a Postgres, el fallo de FK saldría como 500 opaco.
  private async verificarRelaciones(usuario_id: number, empleado_id: number) {
    const [usuario, empleado] = await Promise.all([
      this.prisma.usuarios.findUnique({ where: { id: usuario_id } }),
      this.prisma.empleados.findUnique({ where: { id: empleado_id } }),
    ]);

    if (!usuario) {
      throw new NotFoundException(`Usuario con ID ${usuario_id} no encontrado`);
    }
    if (!empleado) {
      throw new NotFoundException(
        `Empleado con ID ${empleado_id} no encontrado`,
      );
    }
  }

  // Traduce los errores de unicidad de Postgres (cita duplicada) a 409.
  // El índice único es (empleado_id, fecha, hora_inicio): es lo que impide que
  // dos clientes reserven el mismo hueco del mismo tatuador.
  private manejarErrorPrisma(e: unknown) {
    if ((e as { code?: string })?.code === 'P2002') {
      throw new ConflictException(
        'Ya existe una cita para ese empleado, fecha y hora de inicio',
      );
    }
    throw e;
  }

  // Al crear, la hora llega como "HH:mm" y se convierte con `horaADate` (fecha
  // fija 1970-01-01 en UTC): así la columna `@db.Time` guarda exactamente esa
  // hora sin que la zona del servidor la mueva.
  async crear(createCitaDto: CreateCitaDto, sesion?: SesionUsuario) {
    // Un cliente solo puede reservar a su nombre; el admin sí puede reservar
    // para cualquiera (recepción del estudio).
    if (!this.esAdmin(sesion) && createCitaDto.usuario_id !== sesion?.id) {
      throw new ForbiddenException('Solo puedes crear citas a tu nombre');
    }

    this.validarHoras(createCitaDto.hora_inicio, createCitaDto.hora_fin);
    await this.verificarRelaciones(
      createCitaDto.usuario_id,
      createCitaDto.empleado_id,
    );

    try {
      return await this.prisma.citas.create({
        data: {
          usuario_id: createCitaDto.usuario_id,
          empleado_id: createCitaDto.empleado_id,
          fecha: fechaADate(createCitaDto.fecha),
          hora_inicio: horaADate(createCitaDto.hora_inicio),
          hora_fin: horaADate(createCitaDto.hora_fin),
          estado: createCitaDto.estado ?? 'pendiente',
          notas: createCitaDto.notas,
          fecha_actualizacion: new Date(),
        },
        include: relaciones,
      });
    } catch (e) {
      this.manejarErrorPrisma(e);
    }
  }

  // Filtrable por ?usuario_id= y/o ?empleado_id= (útil para la agenda del usuario logueado).
  async obtenerTodos(filtros: { usuario_id?: number; empleado_id?: number }) {
    return this.prisma.citas.findMany({
      where: {
        ...(filtros.usuario_id ? { usuario_id: filtros.usuario_id } : {}),
        ...(filtros.empleado_id ? { empleado_id: filtros.empleado_id } : {}),
      },
      include: relaciones,
      orderBy: [{ fecha: 'asc' }, { hora_inicio: 'asc' }],
    });
  }

  async obtenerUno(id: number) {
    const cita = await this.prisma.citas.findUnique({
      where: { id },
      include: relaciones,
    });

    if (!cita) {
      throw new NotFoundException(`Cita con ID ${id} no encontrada`);
    }

    return cita;
  }

  async actualizar(
    id: number,
    updateCitaDto: UpdateCitaDto,
    sesion?: SesionUsuario,
  ) {
    const cita = await this.obtenerUno(id);
    this.exigirPuedeGestionar(cita, sesion);

    // Reasignar la cita a otro cliente es una operación de recepción: solo el
    // admin. Un cliente no puede "regalar" su cita ni cambiarla de dueño.
    if (!this.esAdmin(sesion) && updateCitaDto.usuario_id !== undefined) {
      throw new ForbiddenException(
        'Solo un administrador puede reasignar una cita a otro usuario',
      );
    }

    // En un PATCH parcial hay que reconstruir el rango completo (lo que llega
    // + lo que ya estaba guardado) para poder validar inicio < fin; validar
    // solo los campos enviados dejaría pasar combinaciones imposibles.
    const hora_inicio =
      updateCitaDto.hora_inicio ?? this.horaDe(cita.hora_inicio);
    const hora_fin = updateCitaDto.hora_fin ?? this.horaDe(cita.hora_fin);
    this.validarHoras(hora_inicio, hora_fin);

    // Solo se revalidan las FK cuando el PATCH manda ambas: si manda una sola,
    // el valor que completa el par ya existía y sigue siendo válido.
    if (
      updateCitaDto.usuario_id !== undefined &&
      updateCitaDto.empleado_id !== undefined
    ) {
      await this.verificarRelaciones(
        updateCitaDto.usuario_id,
        updateCitaDto.empleado_id,
      );
    }

    // `resto` es el DTO sin los tres campos que se convertirán a Date/Fecha:
    // si se pasaran crudos, Prisma recibiría un string en una columna de fecha.
    const resto = { ...updateCitaDto };
    delete resto.fecha;
    delete resto.hora_inicio;
    delete resto.hora_fin;

    try {
      return await this.prisma.citas.update({
        where: { id },
        data: {
          ...resto,
          ...(updateCitaDto.fecha
            ? { fecha: fechaADate(updateCitaDto.fecha) }
            : {}),
          hora_inicio: horaADate(hora_inicio),
          hora_fin: horaADate(hora_fin),
          fecha_actualizacion: new Date(),
        },
        include: relaciones,
      });
    } catch (e) {
      this.manejarErrorPrisma(e);
    }
  }

  async eliminar(id: number, sesion?: SesionUsuario) {
    const cita = await this.obtenerUno(id);
    this.exigirPuedeGestionar(cita, sesion);

    return this.prisma.citas.delete({
      where: { id },
      include: relaciones,
    });
  }

  // Convierte un DateTime de Prisma (columna @db.Time) a "HH:mm".
  private horaDe(d: Date) {
    return d.toISOString().slice(11, 16);
  }
}
