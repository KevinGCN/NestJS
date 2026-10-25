import { IsInt, Matches, Max, Min } from 'class-validator';

// Hora en formato 24h HH:mm (ej: 09:30, 14:00)
// Regex (no `new Date()`) para exigir siempre dos dígitos: "9:30" se rechaza y
// así `aMinutos`/`horaADate` reciben un valor predecible.
const HORA_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Body de `POST /api/horarios-trabajador`: una franja de la plantilla semanal.
 * Aquí solo se valida el formato y el rango 0-6 del día; que `hora_fin` sea
 * posterior a `hora_inicio` y que el empleado exista se comprueba en el
 * servicio, porque requiere comparar campos o consultar la BD.
 */
export class CreateHorarioDto {
  /** Tatuador dueño de la franja: FK a `empleados.id` (por eso `@Min(1)`). */
  @IsInt()
  @Min(1)
  empleado_id: number;

  // 0 = Domingo ... 6 = Sábado
  // Mismo rango que `Date.getUTCDay()` (el usado por `diaSemana()` en
  // common/fechas.ts); `@Max(6)` evita que un 7 o un 9 acaben en la BD.
  @IsInt()
  @Min(0)
  @Max(6)
  dia_semana: number;

  /** Inicio de la franja; se compara en minutos contra `hora_fin` en el servicio. */
  @Matches(HORA_REGEX, { message: 'hora_inicio debe tener formato HH:mm' })
  hora_inicio: string;

  /** Fin de la franja; debe ser estrictamente posterior a `hora_inicio`. */
  @Matches(HORA_REGEX, { message: 'hora_fin debe tener formato HH:mm' })
  hora_fin: string;
}
