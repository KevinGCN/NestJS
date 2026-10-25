import { PartialType } from '@nestjs/mapped-types';
import { CreateHorarioDto } from './create-horario.dto';

/**
 * Body de `PATCH /api/horarios-trabajador/:id`. `PartialType` reutiliza
 * `CreateHorarioDto` y marca todo como opcional (PATCH parcial), manteniendo las
 * validaciones de formato/rango en el campo que sí se envíe.
 * El servicio reconstruye la franja (lo enviado + lo guardado) para seguir
 * comprobando que `hora_fin` sea posterior a `hora_inicio`.
 */
export class UpdateHorarioDto extends PartialType(CreateHorarioDto) {}
