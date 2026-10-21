import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { aMinutos, fechaADate, horaADate } from '../common/fechas';
import { CreateCitaDto } from './dto/create-cita.dto';
import { UpdateCitaDto } from './dto/update-cita.dto';

// Nunca devolver password_hash al cliente.
const usuarioSeguro = { omit: { password_hash: true } } as const;

const relaciones = {
  usuarios: usuarioSeguro,
  empleados: { include: { usuarios: usuarioSeguro } },
} as const;

@Injectable()
export class CitasService {
  constructor(private readonly prisma: PrismaService) {}

  private validarHoras(hora_inicio: string, hora_fin: string) {
    if (aMinutos(hora_fin) <= aMinutos(hora_inicio)) {
      throw new BadRequestException('hora_fin debe ser posterior a hora_inicio');
    }
  }

  private async verificarRelaciones(usuario_id: number, empleado_id: number) {
    const [usuario, empleado] = await Promise.all([
      this.prisma.usuarios.findUnique({ where: { id: usuario_id } }),
      this.prisma.empleados.findUnique({ where: { id: empleado_id } }),
    ]);

    if (!usuario) {
      throw new NotFoundException(`Usuario con ID ${usuario_id} no encontrado`);
    }
    if (!empleado) {
      throw new NotFoundException(`Empleado con ID ${empleado_id} no encontrado`);
    }
  }

  // Traduce los errores de unicidad de Postgres (cita duplicada) a 409.
  private manejarErrorPrisma(e: unknown) {
    if ((e as { code?: string })?.code === 'P2002') {
      throw new ConflictException(
        'Ya existe una cita para ese empleado, fecha y hora de inicio',
      );
    }
    throw e;
  }

  async crear(createCitaDto: CreateCitaDto) {
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

  async actualizar(id: number, updateCitaDto: UpdateCitaDto) {
    const cita = await this.obtenerUno(id);

    const hora_inicio = updateCitaDto.hora_inicio ?? this.horaDe(cita.hora_inicio);
    const hora_fin = updateCitaDto.hora_fin ?? this.horaDe(cita.hora_fin);
    this.validarHoras(hora_inicio, hora_fin);

    if (
      updateCitaDto.usuario_id !== undefined &&
      updateCitaDto.empleado_id !== undefined
    ) {
      await this.verificarRelaciones(
        updateCitaDto.usuario_id,
        updateCitaDto.empleado_id,
      );
    }

    const { fecha, hora_inicio: hi, hora_fin: hf, ...resto } = updateCitaDto;

    try {
      return await this.prisma.citas.update({
        where: { id },
        data: {
          ...resto,
          ...(fecha ? { fecha: fechaADate(fecha) } : {}),
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

  async eliminar(id: number) {
    await this.obtenerUno(id);

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
