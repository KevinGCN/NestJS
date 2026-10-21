import { IsInt, Matches, Max, Min } from 'class-validator';

// Hora en formato 24h HH:mm (ej: 09:30, 14:00)
const HORA_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

export class CreateHorarioDto {
  @IsInt()
  @Min(1)
  empleado_id: number;

  // 0 = Domingo ... 6 = Sábado
  @IsInt()
  @Min(0)
  @Max(6)
  dia_semana: number;

  @Matches(HORA_REGEX, { message: 'hora_inicio debe tener formato HH:mm' })
  hora_inicio: string;

  @Matches(HORA_REGEX, { message: 'hora_fin debe tener formato HH:mm' })
  hora_fin: string;
}
