import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { aMinutos, horaADate } from '../common/fechas';
import { CreateHorarioDto } from './dto/create-horario.dto';
import { UpdateHorarioDto } from './dto/update-horario.dto';

// Nunca devolver password_hash al cliente.
const usuarioSeguro = { omit: { password_hash: true } } as const;

const relaciones = {
  empleados: { include: { usuarios: usuarioSeguro } },
} as const;

@Injectable()
export class HorariosTrabajadorService {
  constructor(private readonly prisma: PrismaService) {}

  private validarHoras(hora_inicio: string, hora_fin: string) {
    if (aMinutos(hora_fin) <= aMinutos(hora_inicio)) {
      throw new BadRequestException('hora_fin debe ser posterior a hora_inicio');
    }
  }

  // Traduce los errores de unicidad de Postgres a 409.
  private manejarErrorPrisma(e: unknown) {
    if ((e as { code?: string })?.code === 'P2002') {
      throw new ConflictException(
        'Ya existe un horario para ese empleado, día y hora de inicio',
      );
    }
    throw e;
  }

  async crear(createHorarioDto: CreateHorarioDto) {
    this.validarHoras(createHorarioDto.hora_inicio, createHorarioDto.hora_fin);

    const empleado = await this.prisma.empleados.findUnique({
      where: { id: createHorarioDto.empleado_id },
    });
    if (!empleado) {
      throw new NotFoundException(
        `Empleado con ID ${createHorarioDto.empleado_id} no encontrado`,
      );
    }

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

  async actualizar(id: number, updateHorarioDto: UpdateHorarioDto) {
    const horario = await this.obtenerUno(id);

    const empleado_id =
      updateHorarioDto.empleado_id ?? horario.empleado_id;
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

  async eliminar(id: number) {
    await this.obtenerUno(id);

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
