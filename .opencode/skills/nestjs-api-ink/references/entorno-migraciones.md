# Entorno, comandos y migraciones

## Variables (`NestJS/.env`)

| Variable | Obligatoria | Notas |
|---|---|---|
| `DATABASE_URL` | sí | Debe terminar en `?options=-c%20search_path%3Dproyecto7` o el CLI de Prisma no ve `proyecto7._prisma_migrations`. |
| `JWT_SECRET` | sí | `src/auth/auth.config.ts` lanza al arrancar si falta (fail fast). |
| `APP_TIMEZONE` | sí | `America/Bogota`; la usa `src/common/fechas.ts`. |
| `GEMINI_API_KEY` | no | Solo backend. Si falta, `POST /api/ia/analyze-tattoo` responde 503. Nunca en el frontend. |
| `FRONTEND_URL` | no (prod sí) | Origen CORS; acepta varios separados por comas. |
| `PORT` | no | Railway lo inyecta; respaldo 3000. |

## Comandos

```powershell
npm run start:dev                 # API en http://localhost:3000/api (watch)
npm run build                     # prisma generate + nest build -> dist/
npm run start:prod                # node dist/src/main (build primero)
npm test                          # Jest, unitarios en src/
npm run test:e2e                  # Jest E2E en test/
npm run lint                      # ESLint SIN --fix
npm run lint:fix                  # ESLint con --fix (solo si el árbol está limpio)
npm run set-rol -- <correo> admin # bootstrap/fix de rol, directo a la BD
npm run set-password -- <correo> "clave"
```

Prisma, siempre desde `NestJS/`:

```powershell
npx prisma validate
npx prisma migrate status
npx prisma generate
npx prisma studio
```

## Migraciones: `migrate dev` NO sirve aquí

El shadow DB se crea sin esquema seleccionado → *"no schema has been selected to
create in"*. Procedimiento manual:

```powershell
# 1) crear la carpeta y el SQL a mano en prisma/migrations/<timestamp>_<nombre>/migration.sql
# 2) aplicarlo
npx prisma db execute --file prisma/migrations/<nombre>/migration.sql --schema prisma/schema.prisma
# 3) registrarlo como aplicado
npx prisma migrate resolve --applied <nombre>
# 4) regenerar el cliente
npx prisma generate
```

- Producción (Railway) sí usa `npx prisma migrate deploy` (`preDeployCommand` de
  `railway.json`); no necesita shadow DB.
- El checksum que guarda Prisma es el `sha256` del SQL **con LF**. Si el archivo se
  guardó con CRLF, Prisma lo marca como "modified": normaliza a LF y, si ya quedó
  mal registrado, borra la fila en `proyecto7._prisma_migrations` y repite
  `migrate resolve --applied`.

## Esquema

- Todo vive en el esquema `proyecto7` (`@@schema("proyecto7")` en `prisma/schema.prisma`).
- `proyecto7_user` no tiene permiso de `CREATE SCHEMA`: si algo intenta crearlo, falla.
- Modelos principales: `usuarios` (rol `cliente|empleado|admin`), `empleados`
  (ficha de tatuador, `usuario_id` opcional), `citas`, `horarios_trabajador`,
  `galeria`, `imagenes` (binarios), `resenas`.
- Un tatuador necesita **fila en `empleados`** (catálogo) **y** `usuarios.rol = 'empleado'`
  (permisos). La UI de Workers hace las dos cosas a la vez.

## Trampas conocidas

- **Tokens y borrados**: `JwtStrategy.validate()` revalida la cuenta en cada petición,
  así que borrar un usuario (o cambiarle el rol) invalida sus tokens al instante → 401.
- **`@IsUrl()` rechaza las rutas del backend**: usar `@IsImagenUrl()`.
- **PowerShell 5.1**: no hay `&&` (usar `;`) ni `Invoke-WebRequest -Form` (usar
  `curl.exe -F "imagen=@archivo"`).
- **ESLint + cliente generado**: el cliente de `src/generated/prisma/` usa imports
  ESM relativos (`.js`); Jest necesita el `moduleNameMapper` que ya está en el
  `jest` de `package.json`. No lo quites.
