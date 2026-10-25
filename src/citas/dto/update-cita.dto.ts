import { PartialType } from '@nestjs/mapped-types';
import { CreateCitaDto } from './create-cita.dto';

/**
 * Body de `PATCH /api/citas/:id`. `PartialType` reutiliza `CreateCitaDto` y
 * marca todos los campos como opcionales (actualización parcial), así que las
 * mismas validaciones de formato siguen aplicando al campo que sí se envíe.
 * El servicio reconstruye el rango horario con lo enviado + lo guardado para
 * seguir comprobando que `hora_fin` > `hora_inicio`.
 */
export class UpdateCitaDto extends PartialType(CreateCitaDto) {}
