import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';

export const ESTADOS_CITA = [
  'pendiente',
  'confirmada',
  'cancelada',
  'completada',
] as const;

export type EstadoCita = (typeof ESTADOS_CITA)[number];

// Hora en formato 24h HH:mm (ej: 09:30, 14:00)
const HORA_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

export class CreateCitaDto {
  @IsInt()
  @Min(1)
  usuario_id: number;

  @IsInt()
  @Min(1)
  empleado_id: number;

  // Fecha en formato ISO YYYY-MM-DD (ej: 2026-10-21)
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'fecha debe tener formato YYYY-MM-DD',
  })
  fecha: string;

  @Matches(HORA_REGEX, { message: 'hora_inicio debe tener formato HH:mm' })
  hora_inicio: string;

  @Matches(HORA_REGEX, { message: 'hora_fin debe tener formato HH:mm' })
  hora_fin: string;

  @IsOptional()
  @IsIn(ESTADOS_CITA)
  estado?: EstadoCita;

  @IsOptional()
  @IsString()
  notas?: string;
}
