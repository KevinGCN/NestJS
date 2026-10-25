/**
 * Autorización por rol (`cliente | empleado | admin`) basada en metadatos.
 *
 * El par `@Roles()` (definido en `roles.decorator.ts`) + `RolesGuard` desacopla
 * la política del código del controlador: la lista de roles permitidos se guarda
 * como metadata del handler/clase y el guard solo la compara con
 * `request.user.rol`.
 *
 * IMPORTANTE: el guard supone que `request.user` ya está poblado, o sea que
 * siempre debe usarse como `@UseGuards(JwtAuthGuard, RolesGuard)`. Invertir el
 * orden haría que `request.user` fuera `undefined` y todo devolviera 403.
 */
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, Rol } from './roles.decorator';

/**
 * Guard de autorización por rol. Debe ejecutarse DESPUÉS de `JwtAuthGuard`
 * para que la estrategia JWT ya haya poblado `request.user`.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // getAllAndOverride: la metadata del handler gana sobre la de la clase, así
    // un controlador puede declarar un rol por defecto y cada ruta afinarlo.
    const roles = this.reflector.getAllAndOverride<Rol[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Si la ruta no define roles, este guard no restringe el acceso.
    if (!roles || roles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const usuario = request.user as { rol?: Rol } | undefined;

    // 403 (autenticado pero sin permiso), no 401: el 401 haría que el
    // interceptor del frontend borrase la sesión y mandara a login.
    if (!usuario || !usuario.rol || !roles.includes(usuario.rol)) {
      throw new ForbiddenException('No tienes permisos para realizar esta operación');
    }

    return true;
  }
}
