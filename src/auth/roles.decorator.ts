
import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

export type Rol = 'cliente' | 'empleado' | 'admin';

export const Roles = (...roles: Rol[]) =>
  SetMetadata(ROLES_KEY, roles);
