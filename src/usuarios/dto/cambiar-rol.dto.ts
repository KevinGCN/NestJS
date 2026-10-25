/**
 * DTO del cambio de rol. `RolUsuario` es el enum que genera Prisma
 * (`cliente | empleado | admin`) y el mismo tipo de la columna `usuarios.rol`,
 * así que el DTO y la base de datos no pueden desincronizarse.
 */
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
  /**
   * `@IsEnum` corta en la frontera HTTP: un valor inventado responde 400 con la
   * lista de roles válidos, en vez de reventar como 500 al llegar a Postgres.
   */
  rol: RolUsuario;
}
