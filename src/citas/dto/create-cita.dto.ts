import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';

/**
 * Body de `POST /api/citas`.
 * Aquí solo se valida el FORMATO (ISO / HH:mm); el significado (que `hora_fin`
 * sea posterior a `hora_inicio`, que las FK existan) se comprueba en
 * `CitasService` porque requiere comparar varios campos o consultar la BD.
 */
export const ESTADOS_CITA = [
  'pendiente',
  'confirmada',
  'cancelada',
  'completada',
] as const;

// Copia a mano del enum `EstadoCita` de Prisma: si se agrega un estado en
// `schema.prisma`, hay que agregarlo también aquí o el DTO lo rechazará.
export type EstadoCita = (typeof ESTADOS_CITA)[number];

// Hora en formato 24h HH:mm (ej: 09:30, 14:00)
// Se valida con regex y no con `new Date()`: así "9:30" (sin cero) se rechaza,
// porque el servicio y la BD esperan siempre "HH:mm" de dos dígitos.
const HORA_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

export class CreateCitaDto {
  /** Cliente que reserva: FK a `usuarios.id` (por eso `@Min(1)`). */
  @IsInt()
  @Min(1)
  usuario_id: number;

  /** Tatuador: FK a `empleados.id`, NO a `usuarios.id` (es la fila del catálogo). */
  @IsInt()
  @Min(1)
  empleado_id: number;

  // Fecha en formato ISO YYYY-MM-DD (ej: 2026-10-21)
  /**
   * Día de la cita, sin hora. El servicio lo convierte con `fechaADate` (UTC)
   * para que la columna `@db.Date` no se corra un día por la zona horaria.
   */
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'fecha debe tener formato YYYY-MM-DD',
  })
  fecha: string;

  /** Inicio de la cita; en el servicio se compara en minutos contra `hora_fin`. */
  @Matches(HORA_REGEX, { message: 'hora_inicio debe tener formato HH:mm' })
  hora_inicio: string;

  /** Debe ser estrictamente posterior a `hora_inicio` (lo valida `validarHoras`). */
  @Matches(HORA_REGEX, { message: 'hora_fin debe tener formato HH:mm' })
  hora_fin: string;

  /** Opcional: si no llega, el servicio guarda 'pendiente' (default de la BD). */
  @IsOptional()
  @IsIn(ESTADOS_CITA)
  estado?: EstadoCita;

  /** Opcional: indicaciones libres del cliente (zona, tamaño, referencias). */
  @IsOptional()
  @IsString()
  notas?: string;
}
