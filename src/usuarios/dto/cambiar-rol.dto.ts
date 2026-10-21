import { IsEnum } from 'class-validator';
import { RolUsuario } from '../../generated/prisma/enums';

/**
 * Body del endpoint `PATCH /api/usuarios/:id/rol`.
 * Solo un admin puede invocarlo (ver RolesGuard).
 */
export class CambiarRolDto {
  @IsEnum(RolUsuario, {
    message: `El rol debe ser uno de: ${Object.keys(RolUsuario).join(', ')}`,
  })
  rol: RolUsuario;
}
