import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';

/** Clave de metadatos donde se guardan los roles permitidos. */
export const ROLES_KEY = 'roles';

/**
 * Decorador: `@Roles('admin')` sobre un handler o controlador.
 * Requiere que el guard se registre en la cadena: `@UseGuards(JwtAuthGuard, RolesGuard)`.
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

/**
 * Guard de autorización por rol. Debe ejecutarse DESPUÉS de `JwtAuthGuard`
 * para que `request.user` ya esté poblado por la estrategia JWT.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const rolesPermitidos = Reflect.getMetadata(ROLES_KEY, context.getHandler()) as
      | string[]
      | undefined;

    // Sin roles definidos en la ruta → no se restringe (solo exige sesión).
    if (!rolesPermitidos || rolesPermitidos.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const usuario = request.user as { rol?: string } | undefined;

    if (!usuario?.rol || !rolesPermitidos.includes(usuario.rol)) {
      throw new ForbiddenException(
        'No tienes permisos para realizar esta acción (se requiere rol: ' +
          rolesPermitidos.join(', ') +
          ').',
      );
    }

    return true;
  }
}
