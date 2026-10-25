---
name: API Projecto INK (NestJS)
description: Convenciones del API de Projecto INK (NestJS 11 + Prisma 7 con adapter-pg, esquema `proyecto7`). Úsala al crear o modificar endpoints, servicios con Prisma, DTOs, guards de rol, subida de imágenes, migraciones o tests dentro de `NestJS/`.
---

# API de Projecto INK

Antes de tocar comandos de terminal, lee `references/entorno-migraciones.md`
(variables de entorno, arranque, migraciones de Prisma y trampas conocidas).

## Reglas que no se rompen

1. **`password_hash` nunca sale del backend.** Toda lectura pública de usuarios
   usa el `select` explícito `USUARIO_SELECT` de `src/usuarios/usuarios.service.ts`.
   Si hay que publicar un campo nuevo, se añade ahí a mano (nunca un `include` ni
   un `select: true` suelto).
2. **Cada error con su código HTTP**:
   - 404 `NotFoundException`: la fila no existe **o** una FK apunta a algo que no existe.
   - 409 `ConflictException`: duplicado por índice único (`code === 'P2002'`) o regla de negocio (franja de horario ocupada, empleado ya vinculado a ese usuario).
   - 403 `ForbiddenException`: el recurso existe pero no es de quien lo pide.
   - 400 `BadRequestException`: validación de negocio que el DTO no puede cubrir (`hora_inicio >= hora_fin`, archivo vacío).
3. **DTOs con `class-validator`.** Las rutas de imagen (`imagen_url`, `foto_perfil_url`)
   validan con `@IsImagenUrl()` de `src/common/validadores.ts`, no con `@IsUrl()`.
4. **`UpdateUsuarioDto` no tiene `rol`** a propósito (evita autopromoción). Los roles
   solo cambian en `PATCH /api/usuarios/:id/rol` (`@Roles('admin')`).
5. **Comentarios, mensajes de error y documentación en español.** Campos en
   snake_case, igual que el esquema de Prisma.

## Capas

`controller` (rutas + guards + DTO) → `service` (Prisma + reglas) → `dto/`.
Ninguna consulta a Prisma en el controlador; ninguna respuesta HTTP en el servicio.

## Autorización: dos niveles

- **Por rol**: `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('admin')`.
  El orden importa: `RolesGuard` lee `request.user`, que puebla `JwtAuthGuard`.
- **Por recurso**: cuando importa *de quién* es la fila (citas, horarios), el
  servicio recibe `SesionUsuario` (`src/common/sesion.ts`) como último parámetro
  opcional y decide ahí. Patrón vigente en `citas.service.ts`:

  ```ts
  private esAdmin(sesion?: SesionUsuario) {
    return sesion?.rol === 'admin';
  }

  // Cita: dueño, tatuador asignado o admin.
  if (this.esAdmin(sesion)) return;
  if (sesion?.id === cita.usuario_id) return;
  if (sesion?.id === cita.empleados?.usuario_id) return;
  throw new ForbiddenException('...');
  ```

  En horarios el dueño es `empleados.usuario_id`; en citas es
  `citas.usuario_id` o el `usuario_id` del empleado asignado.

  El controlador pasa la sesión así:
  `this.servicio.actualizar(id, dto, req.user)` con
  `@Req() req: { user: SesionUsuario }`.

## Imágenes: viven en la base de datos

- `ImagenesService.guardar()` escribe el binario en `proyecto7.imagenes` (`data BYTEA`)
  y devuelve `{ id, url: '/api/imagenes/<id>' }`.
- Las columnas guardan la ruta **relativa** `/api/imagenes/<id>` (sigue siendo válida
  en cualquier host). La resuelve el frontend con `urlImagen()`.
- `ImagenesService.eliminarPorUrl()` borra la fila y el binario; también limpia
  archivos legacy en `/uploads/`. `uploads/` ya no recibe archivos nuevos.
- Límites y tipos en `src/common/imagenes.ts` (`IMAGEN_MAX_BYTES` 5 MB, `IMAGEN_TIPOS`).

## Prisma

- Cliente generado en `src/generated/prisma/` → importar desde
  `../generated/prisma/client` (nunca `@prisma/client`).
- Acceso siempre por `PrismaService` (`src/prisma/prisma.service.ts`, adapter-pg + `pg.Pool`).
- Enums desde `../generated/prisma/enums` (p. ej. `RolUsuario`).
- `src/generated/prisma/**` está ignorado por ESLint: no lo formatees ni lo edites a mano.

## Verificación obligatoria antes de dar algo por terminado

```powershell
npx tsc --noEmit      # tipos
npm run lint          # NO corrige; para corregir: npm run lint:fix
npm test              # Jest (unitarios en src/)
```

Si `npm run lint` marca cientos de errores de prettier en archivos que no tocaste,
el problema son los finales de línea: el repo es LF (`NestJS/.gitattributes`) y
`lint:fix` masivo genera diffs falsos. Revisa antes de correrlo.

## Tests (Jest)

Los specs mockean `PrismaService` con objetos `{ modelo: { metodo: jest.fn() } }` y
leen los argumentos con el helper `argsDe<T>(fn)` que ya existe en
`app.controller.spec.ts`, `imagenes.service.spec.ts` y compañía. Prefiere ese helper
a `expect(...).toHaveBeenCalledWith(expect.objectContaining(...))`, que dispara
`@typescript-eslint/no-unsafe-assignment`.
