/**
 * Decorador `@Roles()` y la clave de metadata que consume `RolesGuard`.
 *
 * Vive en su propio archivo (y no dentro de `roles.guard.ts`) para que los
 * controladores puedan importar el decorador sin arrastrar el guard: así no se
 * crea una dependencia circular entre guards y controladores.
 */
import { SetMetadata } from '@nestjs/common';

/** Clave de metadata donde se guarda la lista de roles permitidos. */
export const ROLES_KEY = 'roles';

/** Roles que existen en `usuarios.rol` (alineado con el enum de Prisma). */
export type Rol = 'cliente' | 'empleado' | 'admin';

/**
 * Declara qué roles pueden ejecutar un handler o un controlador completo.
 * Sin este decorador, `RolesGuard` deja pasar a cualquier usuario autenticado.
 */
export const Roles = (...roles: Rol[]) => SetMetadata(ROLES_KEY, roles);
