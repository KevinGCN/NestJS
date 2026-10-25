# API — Ink Creature (NestJS)

Documentación de **todos los endpoints existentes** en el backend, extraída directamente del código
(controllers, DTOs y services) el **2026-10-25**.

- **Repo:** `NestJS/` (servicio de Railway)
- **Prefijo global:** todas las rutas viven bajo `/api` (`app.setGlobalPrefix('api')` en `src/main.ts`)
- **Base local:** `http://localhost:3000/api`
- **Base producción:** `https://<servicio>.up.railway.app/api`
- **Total:** **37 endpoints** en 9 controllers (+ 1 servicio estático legacy)

---

## 1. Convenciones comunes

### 1.1 Autenticación

JWT con esquema Bearer. El token se obtiene en `POST /api/auth/login` y se envía en cada petición protegida:

```
Authorization: Bearer <access_token>
```

- El token solo contiene `sub` (id del usuario).
- `JwtStrategy.validate()` **relee el usuario en la BD en cada petición**: si la cuenta fue borrada o
  desactivada (`activo = false`), responde `401 Sesión inválida` aunque el token no haya caducado.
- Caducidad: `JWT_EXPIRES_IN` (por defecto **`3600s` = 1 hora**).

### 1.2 Roles

`usuarios.rol` ∈ **`cliente` | `empleado` | `admin`** (enum `RolUsuario`).

| Nivel en la tabla | Significado |
|---|---|
| **Público** | Sin cabecera `Authorization` |
| **JWT** | Cualquier usuario autenticado, sin importar su rol |
| **Admin** | `JwtAuthGuard` + `RolesGuard` con `@Roles('admin')` |

`RolesGuard` responde **403** (no 401) cuando el rol no alcanza, para que el interceptor del frontend
no borre la sesión.

### 1.3 Validación de cuerpos (global)

`ValidationPipe` global con `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`:

- Un campo **no declarado** en el DTO produce **400** (no se descarta en silencio).
- Los `:id` de la URL usan `ParseIntPipe`: un valor no numérico → **400**.
- Los `?filtros` de query se convierten a mano con `Number()`: un valor no numérico se **ignora**
  (no da error); un `0` también se ignora.

Forma estándar del error de validación:

```json
{
  "statusCode": 400,
  "message": ["email must be an email", "..."],
  "error": "Bad Request"
}
```

### 1.4 CORS

Orígenes permitidos (`src/main.ts`):

- `http://localhost:4200`
- `https://ink-creature-v2.netlify.app`
- `https://inkcreature.netlify.app`
- los que añada la variable **`FRONTEND_URL`** (varios separados por comas)

Un origen que no esté en esa lista recibe `blocked by CORS policy` en el navegador.

### 1.5 Subida de archivos

Los endpoints multipart esperan el campo **`imagen`**:

| Límite | Valor |
|---|---|
| Tamaño máximo | **5 MB** (`IMAGEN_MAX_BYTES`) → al excederlo, **413** |
| Tipos permitidos | `image/jpeg`, `image/png`, `image/webp` (`IMAGEN_TIPOS`) |
| Tipo no permitido | **400** `Tipo de imagen no permitido (jpeg, png o webp)` |
| Archivo vacío | **400** `El archivo "imagen" está vacío` |
| Campo ausente | **400** `Falta el archivo "imagen"` |

> **SVG y GIF están prohibidos a propósito** (SVG puede llevar scripts y se serviría desde el dominio del API).

Los binarios se guardan en la **base de datos** (`proyecto7.imagenes`, columna `data` BYTEA), no en disco.
Las URLs guardadas son **relativas**: `/api/imagenes/<id>`.

### 1.6 Fechas y horas

- Fechas: `YYYY-MM-DD` (se normalizan a medianoche UTC con `fechaADate`).
- Horas: `HH:mm` de 24 h y **dos dígitos obligatorios** (`9:30` se rechaza).
- Zona del negocio: `APP_TIMEZONE` (por defecto `America/Bogota`).

---

## 2. Resumen de endpoints

| # | Método | Ruta | Auth | Rol | Descripción |
|---|---|---|---|---|---|
| 1 | `GET` | `/api` | Público | — | Saludo `Hello World!` (smoke test) |
| 2 | `GET` | `/api/health` | Público | — | Healthcheck con `SELECT 1` a Postgres |
| 3 | `POST` | `/api/auth/login` | Público | — | Login, devuelve el JWT |
| 4 | `GET` | `/api/auth/me` | JWT | — | Usuario de la sesión actual |
| 5 | `POST` | `/api/usuarios` | Público | — | Registro de usuario |
| 6 | `GET` | `/api/usuarios` | JWT | **admin** | Lista todos los usuarios |
| 7 | `GET` | `/api/usuarios/:id` | JWT | propio / admin | Ver un usuario |
| 8 | `PATCH` | `/api/usuarios/:id` | JWT | propio / admin | Actualizar perfil |
| 9 | `POST` | `/api/usuarios/:id/foto` | JWT | propio / admin | Subir foto de perfil (multipart) |
| 10 | `PATCH` | `/api/usuarios/:id/rol` | JWT | **admin** | Cambiar rol |
| 11 | `DELETE` | `/api/usuarios/:id` | JWT | **admin** | Borrar usuario (+ su foto) |
| 12 | `POST` | `/api/galeria/upload` | JWT | **admin** | Subir archivo a la BD |
| 13 | `POST` | `/api/galeria` | JWT | **admin** | Registrar metadatos del tatuaje |
| 14 | `GET` | `/api/galeria` | Público | — | Listar galería (más reciente primero) |
| 15 | `GET` | `/api/galeria/:id` | Público | — | Ver una entrada de galería |
| 16 | `PATCH` | `/api/galeria/:id` | JWT | **admin** | Actualizar entrada |
| 17 | `DELETE` | `/api/galeria/:id` | JWT | **admin** | Borrar entrada + binario |
| 18 | `POST` | `/api/imagenes` | JWT | — | Subir imagen a la BD |
| 19 | `GET` | `/api/imagenes` | JWT | — | Listar metadatos de imágenes |
| 20 | `GET` | `/api/imagenes/:id` | **Público** | — | Servir el binario (la URL de la imagen) |
| 21 | `DELETE` | `/api/imagenes/:id` | JWT | — | Borrar imagen de la BD |
| 22 | `POST` | `/api/empleados` | JWT | **admin** | Meter usuario al catálogo de tatuadores |
| 23 | `GET` | `/api/empleados` | Público | — | Listar tatuadores |
| 24 | `GET` | `/api/empleados/:id` | Público | — | Ver un tatuador |
| 25 | `PATCH` | `/api/empleados/:id` | JWT | **admin** | Actualizar ficha |
| 26 | `DELETE` | `/api/empleados/:id` | JWT | **admin** | Borrar ficha del catálogo |
| 27 | `POST` | `/api/citas` | JWT | propio / admin | Crear cita |
| 28 | `GET` | `/api/citas` | Público | — | Listar citas (filtros opcionales) |
| 29 | `GET` | `/api/citas/:id` | Público | — | Ver una cita |
| 30 | `PATCH` | `/api/citas/:id` | JWT | dueño / tatuador / admin | Actualizar cita (incl. `estado`) |
| 31 | `DELETE` | `/api/citas/:id` | JWT | dueño / tatuador / admin | Borrar cita |
| 32 | `POST` | `/api/horarios-trabajador` | JWT | tatuador / admin | Crear franja semanal |
| 33 | `GET` | `/api/horarios-trabajador` | Público | — | Listar horarios (filtro opcional) |
| 34 | `GET` | `/api/horarios-trabajador/:id` | Público | — | Ver una franja |
| 35 | `PATCH` | `/api/horarios-trabajador/:id` | JWT | tatuador / admin | Actualizar franja |
| 36 | `DELETE` | `/api/horarios-trabajador/:id` | JWT | tatuador / admin | Borrar franja |
| 37 | `POST` | `/api/ia/analyze-tattoo` | JWT | — | Analizar descripción con Gemini |
| — | `GET` | `/uploads/<archivo>` | Público | — | **Estático legacy** (fuera de `/api`, sin uso nuevo) |

---

## 3. Raíz y healthcheck — `src/app.controller.ts`

### `GET /api`

Público. Respuesta `text/html`/texto plano: `Hello World!`

### `GET /api/health`

Público. Obliga a Postgres a responder con `SELECT 1`.

**200**

```json
{ "status": "ok", "baseDeDatos": "conectada", "hora": "2026-10-25T15:04:05.123Z" }
```

**503** (la BD no responde)

```json
{
  "status": "error",
  "baseDeDatos": "sin respuesta",
  "detalle": "<mensaje del driver>",
  "hora": "2026-10-25T15:04:05.123Z"
}
```

---

## 4. Autenticación — `/api/auth`

### `POST /api/auth/login` — público

**Body**

```json
{ "email": "usuario@ejemplo.com", "password": "mínimo-8-caracteres" }
```

| Campo | Validación |
|---|---|
| `email` | `@IsEmail()` |
| `password` | `@IsString()` + `@IsNotEmpty()` (la política de longitud se aplica al registrarse) |

**200**

```json
{ "access_token": "eyJhbGciOi...", "token_type": "Bearer", "expires_in": 3600 }
```

**Errores**

| Código | Cuándo |
|---|---|
| `400` | `email`/`password` ausentes o `email` mal formado |
| `401` `Credenciales inválidas` | email no existe, contraseña incorrecta **o** cuenta con `activo = false` |

> El mismo mensaje para los tres casos: no se revela qué parte falló. Cuando el email no existe se
> compara igualmente contra `DUMMY_HASH` para no filtrar información por tiempo de respuesta.

### `GET /api/auth/me` — JWT

Devuelve el usuario que `JwtStrategy` dejó en `request.user` (select público completo):

```json
{
  "id": 5,
  "nombre": "Kevin",
  "apellido": "Cobo",
  "email": "kgcobo@gmail.com",
  "telefono": null,
  "foto_perfil_url": "/api/imagenes/8",
  "rol": "admin",
  "activo": true,
  "fecha_registro": "2026-08-26T22:07:49.000Z",
  "fecha_actualizacion": "2026-10-21T10:00:00.000Z"
}
```

**401** sin token, con token caducado, de una cuenta borrada o desactivada (`Sesión inválida`).

---

## 5. Usuarios — `/api/usuarios`

**Select público (`USUARIO_SELECT`)** — presente en todas las respuestas:
`id`, `nombre`, `apellido`, `email`, `telefono`, `foto_perfil_url`, `rol`, `activo`,
`fecha_registro`, `fecha_actualizacion`.

> `password_hash` **nunca** se serializa.

### `POST /api/usuarios` — público (registro)

```json
{
  "nombre": "Ana",
  "apellido": "Pérez",
  "email": "ana@ejemplo.com",
  "password": "contraseña-larga",
  "telefono": "+57 300 000 0000",
  "foto_perfil_url": "/api/imagenes/12"
}
```

| Campo | Obligatorio | Validación |
|---|---|---|
| `nombre` | Sí | string con al menos un carácter no blanco |
| `apellido` | Sí | ídem |
| `email` | Sí | `@IsEmail()` + `@unique` en la BD |
| `password` | Sí | texto, no vacío, **mínimo 8 caracteres** |
| `telefono` | No | string |
| `foto_perfil_url` | No | string (sin validación de formato aquí) |

- El rol **no** se puede enviar: la BD asigna `cliente` por defecto. Tampoco `activo`.
- La contraseña se cifra con **scrypt** y solo se guarda `password_hash`.

**201** → usuario público.

**409** `El correo <email> ya está registrado` (violación `P2002`).
**400** si el body trae `rol`, `activo` o cualquier campo no declarado (`forbidNonWhitelisted`).

### `GET /api/usuarios` — JWT + admin

**200** → array de usuarios con el select público. Sin orden garantizado.

**401** sin token · **403** si el rol no es `admin`.

### `GET /api/usuarios/:id` — JWT (propio usuario o admin)

**200** → usuario público. **403** `No tienes permiso para consultar este usuario`.
**404** `Usuario con ID <id> no encontrado`.

### `PATCH /api/usuarios/:id` — JWT (propio usuario o admin)

Actualización parcial: **todo opcional**, se escribe solo lo enviado.

```json
{ "nombre": "Ana María", "telefono": "", "password": "otra-clave-2026" }
```

| Campo | Validación |
|---|---|
| `nombre`, `apellido` | string no blanco |
| `email` | `@IsEmail()` |
| `password` | **mínimo 8 caracteres** (se vuelve a cifrar con scrypt) |
| `telefono` | string (cadena vacía para borrarlo) |
| `foto_perfil_url` | string |

- `rol` y `activo` **no** están en el DTO → enviarlos devuelve **400**.
- **409** si el `email` ya está registrado (mismo `P2002` que en el registro).
- Si el PATCH cambia `foto_perfil_url`, el **binario anterior se borra** de `imagenes` (igual que en
  `POST /:id/foto`), para no dejar la fila huérfana.

**403** `No tienes permiso para modificar este usuario` · **404** si no existe.

### `POST /api/usuarios/:id/foto` — JWT (propio usuario o admin)

`multipart/form-data`, campo **`imagen`** (JPEG/PNG/WebP, ≤ 5 MB).

- Guarda el binario en `proyecto7.imagenes`.
- Actualiza `foto_perfil_url` a `/api/imagenes/<id>`.
- **Borra automáticamente la foto anterior** (si era una imagen en la BD).

**201** → usuario público actualizado.

**Errores:** `400` falta el archivo / tipo no permitido · `403` `Sólo puedes cambiar tu propia foto (o ser administrador).`
· `413` demasiado grande · `404` usuario inexistente.

### `PATCH /api/usuarios/:id/rol` — JWT + admin

```json
{ "rol": "empleado" }
```

Valores válidos: `cliente`, `empleado`, `admin` (`@IsEnum(RolUsuario)`).

**200** → usuario público con el rol nuevo. **400** rol inválido (el mensaje lista los válidos)
· **403** no admin · **404** usuario inexistente.

> Cambiar el rol surte efecto **inmediato** sobre tokens ya emitidos, porque el JWT solo guarda el id
> y el rol se relee de la BD en cada petición.

### `DELETE /api/usuarios/:id` — JWT + admin

**200** → usuario eliminado (select público). También borra su foto de perfil de la tabla `imagenes`.

- Los tokens emitidos antes del borrado pasan a devolver **401 Sesión inválida**.
- Las **citas** y la **ficha de empleado** del usuario se borran en cascada (`onDelete: Cascade`).
- **409** si el usuario subió fotos a la galería (`galeria.subido_por` es una FK obligatoria **sin**
  cascada): hay que borrar o reasignar esas filas antes de eliminar la cuenta.

---

## 6. Galería — `/api/galeria`

Fila de `galeria`: `id`, `subido_por`, `empleado_id`, `imagen_url`, `titulo`, `descripcion`, `estilo`,
`fecha_subida` + relaciones incluidas:

```json
{
  "id": 13,
  "subido_por": 5,
  "empleado_id": 4,
  "imagen_url": "/api/imagenes/7",
  "titulo": "Tatuaje estilo Anime",
  "descripcion": "…",
  "estilo": "Anime",
  "fecha_subida": "2026-10-21T12:00:00.000Z",
  "usuarios": { "id": 5, "nombre": "Kevin", "apellido": "Cobo", "foto_perfil_url": "/api/imagenes/8" },
  "empleados": {
    "id": 4,
    "usuario_id": 5,
    "especialidad": "Realismo",
    "biografia": "…",
    "fecha_contratacion": "2026-08-26",
    "activo": true,
    "usuarios": { "id": 5, "nombre": "Kevin", "apellido": "Cobo", "foto_perfil_url": "/api/imagenes/8" }
  }
}
```

> El usuario de la relación va con **select público**: `id`, `nombre`, `apellido`, `foto_perfil_url`
> (sin email ni teléfono).

### `POST /api/galeria/upload` — JWT + admin

`multipart/form-data`, campo **`imagen`**.

**201**

```json
{ "url": "/api/imagenes/7", "id": 7 }
```

Es el **paso 1** del flujo de publicación; el **paso 2** es `POST /api/galeria` con esa `url`.

**Errores:** `400` falta el archivo / tipo no permitido / vacío · `403` no admin · `413` > 5 MB.

### `POST /api/galeria` — JWT + admin

Registra los **metadatos** de una imagen que ya existe. Aquí **no** se sube ningún archivo.

```json
{
  "subido_por": 5,
  "empleado_id": 4,
  "imagen_url": "/api/imagenes/7",
  "titulo": "Tatuaje estilo Anime",
  "descripcion": "Brazo completo",
  "estilo": "Anime"
}
```

| Campo | Obligatorio | Validación |
|---|---|---|
| `subido_por` | Sí | entero ≥ 1 (FK a `usuarios.id`) |
| `empleado_id` | No | entero ≥ 1 (FK a `empleados.id`) |
| `imagen_url` | Sí | `@IsImagenUrl()` → ver abajo |
| `titulo` | No | string |
| `descripcion` | No | string |
| `estilo` | No | string libre |

**Formatos aceptados por `IsImagenUrl()`** (patrón anclado, `src/common/validadores.ts`):

| Valor | ¿Aceptado? |
|---|---|
| `https://cdn.ejemplo.com/foto.jpg` | ✅ |
| `/api/imagenes/7` | ✅ (lo que devuelve `/upload`) |
| `/uploads/viejo.jpg` | ✅ (legacy en disco) |
| `/files/1712-abc.webp` | ❌ **400** |
| `image/DBZ.jpg` | ❌ **400** |
| `javascript:alert(1)` | ❌ **400** |

**201** → fila de galería con relaciones.

**404** `Usuario con ID <id> no encontrado` / `Empleado con ID <id> no encontrado`: las FK se validan
antes de escribir, así que un id inventado no llega a Postgres.

### `GET /api/galeria` — público

**200** → array de galería, orden `fecha_subida DESC` (lo más reciente primero).

### `GET /api/galeria/:id` — público

**200** → fila con relaciones. **404** `Tatuaje con ID <id> no encontrado`.

### `PATCH /api/galeria/:id` — JWT + admin

Todo opcional: `subido_por`, `empleado_id`, `imagen_url`, `titulo`, `descripcion`, `estilo`.

> Cambiar `imagen_url` **no** borra el binario anterior: queda huérfano en `proyecto7.imagenes`.
> Solo `DELETE` limpia el binario.

**200** → fila actualizada · **400** validación · **404** no existe.

### `DELETE /api/galeria/:id` — JWT + admin

Borra la fila **y** el binario asociado (`eliminarPorUrl` entiende `/api/imagenes/<id>` y `/uploads/<archivo>`).

**200** → fila eliminada · **404** no existe.

---

## 7. Imágenes — `/api/imagenes`

Metadatos (sin el binario) en los listados:

`id`, `nombre`, `mime_type`, `tamano`, `fecha_subida`

### `POST /api/imagenes` — JWT

`multipart/form-data`, campo **`imagen`**.

**201**

```json
{
  "id": 7,
  "nombre": "foto.jpg",
  "mime_type": "image/jpeg",
  "tamano": 184320,
  "url": "/api/imagenes/7",
  "fecha_subida": "2026-10-21T12:00:00.000Z"
}
```

> El nombre original se sanea a `[a-z0-9._-]`, se recorta a 120 caracteres y se le fuerza la
> extensión según el MIME.

### `GET /api/imagenes` — JWT

**200** → array de metadatos, orden `fecha_subida DESC`. **No** incluye `data`.

### `GET /api/imagenes/:id` — **público**

Devuelve el **binario** (`Content-Type` real de la imagen). Es la URL que se guarda en
`galeria.imagen_url` y `usuarios.foto_perfil_url`, y la que carga el `<img>` sin token.

Cabeceras:

```
Content-Type: image/jpeg
Content-Length: 184320
Cache-Control: public, max-age=31536000, immutable
Content-Disposition: inline; filename="foto.jpg"
```

**404** `Imagen con ID <id> no encontrada`.

### `DELETE /api/imagenes/:id` — JWT

**200** → fila eliminada con solo metadatos (`id`, `nombre`, `mime_type`, `tamano`, `fecha_subida`).
**404** si no existe.

> El binario **no** viaja en la respuesta: el `select` del `delete` lo excluye.

---

## 8. Empleados / tatuadores — `/api/empleados`

Fila de `empleados`: `id`, `usuario_id`, `especialidad`, `biografia`, `fecha_contratacion`, `activo`
+ `usuarios` (select público) + `galeria[]`.

> Una fila aquí **solo** significa "está en el catálogo". El permiso real es `usuarios.rol = 'empleado'`.
> Para que alguien sea tatuador de verdad hacen falta **las dos cosas**.

### `POST /api/empleados` — JWT + admin

```json
{ "usuario_id": 5, "especialidad": "Realismo", "biografia": "10 años de experiencia", "activo": true }
```

| Campo | Obligatorio | Validación |
|---|---|---|
| `usuario_id` | Sí | entero ≥ 1, **único** (un usuario = una ficha) |
| `especialidad` | No | string |
| `biografia` | No | string |
| `activo` | No | boolean (por defecto `true`) |

**201** → ficha con `usuarios` incluido.

**404** `Usuario con ID <id> no encontrado` · **409** `El usuario <id> ya tiene ficha de tatuador` (`P2002`).
Este endpoint **no** cambia el rol.

### `GET /api/empleados` — público

**200** → array de fichas con `usuarios` (público) y `galeria[]`. Sin orden garantizado.

### `GET /api/empleados/:id` — público

**200** → ficha con relaciones. **404** `Empleado con ID <id> no encontrado`.

### `PATCH /api/empleados/:id` — JWT + admin

`especialidad`, `biografia`, `activo` (todos opcionales). **`usuario_id` no se puede cambiar** (400 si se envía).

> `"activo": false` "jubila" al tatuador sin perder citas ni fotos. Es la alternativa segura a borrar.

**200** → ficha actualizada · **404** no existe.

### `DELETE /api/empleados/:id` — JWT + admin

**200** → ficha eliminada. **No** borra al usuario.

**409** si el tatuador ya tiene **citas** o **horarios** (FK `Restrict`); el mensaje indica que se use
`PATCH { "activo": false }`.

---

## 9. Citas — `/api/citas`

Fila de `citas`: `id`, `usuario_id`, `empleado_id`, `fecha` (`YYYY-MM-DD`), `hora_inicio`, `hora_fin`,
`estado`, `notas`, `fecha_creacion`, `fecha_actualizacion` + relaciones:

- `usuarios`: usuario que reservó
- `empleados`: ficha + su `usuarios`

> Las relaciones usan el **select público** del usuario (`id`, `nombre`, `apellido`, `foto_perfil_url`),
> igual que `empleados` y `galeria`: **no** exponen `email` ni `telefono`.

`estado` ∈ `pendiente | confirmada | cancelada | completada` (enum `EstadoCita`; por defecto `pendiente`).

### `POST /api/citas` — JWT

```json
{
  "usuario_id": 3,
  "empleado_id": 1,
  "fecha": "2026-11-02",
  "hora_inicio": "14:00",
  "hora_fin": "16:00",
  "estado": "pendiente",
  "notas": "Antebrazo, referencia por WhatsApp"
}
```

| Campo | Obligatorio | Validación |
|---|---|---|
| `usuario_id` | Sí | entero ≥ 1 (FK `usuarios.id`) |
| `empleado_id` | Sí | entero ≥ 1 (FK **`empleados.id`**, no `usuarios.id`) |
| `fecha` | Sí | `YYYY-MM-DD` |
| `hora_inicio` | Sí | `HH:mm` (24 h, dos dígitos) |
| `hora_fin` | Sí | `HH:mm`, **estrictamente posterior** a `hora_inicio` |
| `estado` | No | uno de los 4 estados |
| `notas` | No | string |

**201** → cita con relaciones.

> Solo se puede crear **a nombre propio**: si `usuario_id` no es el `sub` del JWT se responde `403`
> (el admin sí puede reservar para cualquiera, como recepción).

**Errores**

| Código | Cuándo |
|---|---|
| `400` | formato inválido o `hora_fin <= hora_inicio` |
| `403` | `usuario_id` no es el del token y no eres admin |
| `404` | `usuario_id` o `empleado_id` no existen (se comprueban antes de escribir) |
| `409` | `Ya existe una cita para ese empleado, fecha y hora de inicio` (índice único `empleado_id + fecha + hora_inicio`) |

### `GET /api/citas` — público

Query params opcionales:

- `?usuario_id=<id>` → citas de ese cliente
- `?empleado_id=<id>` → citas de ese tatuador
- ambos a la vez → intersección

**200** → array ordenado por `fecha ASC, hora_inicio ASC`.

> Los filtros son **comodidad, no control de acceso**: cualquiera ve todas las citas.
> Un valor no numérico se ignora silenciosamente.

### `GET /api/citas/:id` — público

**200** → cita con relaciones · **404** `Cita con ID <id> no encontrada`.

### `PATCH /api/citas/:id` — JWT

`PartialType(CreateCitaDto)`: mismos campos, todos opcionales. Es el endpoint que se usa para
**confirmar / cancelar / completar**:

```json
{ "estado": "confirmada" }
```

- El servicio reconstruye el rango completo (lo enviado + lo guardado) y vuelve a validar `hora_fin > hora_inicio`.
- Solo revalida las FK si el PATCH trae **ambas** (`usuario_id` y `empleado_id`).
- **Reasignar** la cita a otro cliente (`usuario_id`) es solo de admin: un cliente recibe `403`.

**200** → cita actualizada · **400** horas inválidas · **403** la cita no es tuya · **404** no existe · **409** hueco duplicado.

### `DELETE /api/citas/:id` — JWT

**200** → cita eliminada (con relaciones) · **403** la cita no es tuya · **404** no existe.

> **Autorización por recurso** (la comprobación vive en `CitasService`, no en un guard porque depende de
> la fila): pueden gestionar la cita el **cliente que la reservó** (`usuario_id` = `sub` del JWT), el
> **tatuador que la atiende** (`empleados.usuario_id` = `sub`) y cualquier **admin**. El resto recibe `403`.

---

## 10. Horarios del trabajador — `/api/horarios-trabajador`

Plantilla **semanal** del tatuador (no son citas concretas).

Fila: `id`, `empleado_id`, `dia_semana` (0 = domingo … 6 = sábado), `hora_inicio`, `hora_fin`
+ `empleados` (ficha + `usuarios`).

> La relación usa el **select público** del usuario (sin `email` ni `telefono`).

### `POST /api/horarios-trabajador` — JWT

```json
{ "empleado_id": 4, "dia_semana": 2, "hora_inicio": "09:00", "hora_fin": "18:00" }
```

| Campo | Obligatorio | Validación |
|---|---|---|
| `empleado_id` | Sí | entero ≥ 1 |
| `dia_semana` | Sí | entero **0–6** |
| `hora_inicio` | Sí | `HH:mm` |
| `hora_fin` | Sí | `HH:mm`, posterior a `hora_inicio` |

**201** → franja con relaciones.

**Errores:** `400` formato/rango/`hora_fin <= hora_inicio` · `403` la ficha es de otro tatuador
· `404` empleado inexistente · `409` `Ya existe un horario para ese empleado, día y hora de inicio`.

> El índice único corta el **duplicado exacto**, pero **no detecta solapamientos**
> (09:00–12:00 y 11:00–14:00 del mismo día pasan sin error).

### `GET /api/horarios-trabajador` — público

Query opcional: `?empleado_id=<id>`. **200** → array ordenado por `dia_semana ASC, hora_inicio ASC`.

### `GET /api/horarios-trabajador/:id` — público

**200** → franja · **404** `Horario con ID <id> no encontrado`.

### `PATCH /api/horarios-trabajador/:id` — JWT

`PartialType(CreateHorarioDto)`: todos opcionales. El servicio completa la franja con lo guardado y
revalida el rango.

Si el PATCH mueve la franja a otra ficha (`empleado_id`), se comprueba **también** que la ficha destino
sea del mismo usuario (o eres admin): si no, `403`.

**200** → franja actualizada · **400** · **403** · **404** · **409** duplicado.

### `DELETE /api/horarios-trabajador/:id` — JWT

**200** → franja eliminada · **403** la ficha es de otro tatuador · **404** no existe.

> **Autorización por recurso** (en `HorariosTrabajadorService`): solo el **tatuador dueño de la ficha**
> (`empleados.usuario_id` = `sub` del JWT) o un **admin** pueden crear/editar/borrar franjas de ese
> tatuador. El resto recibe `403`.

---

## 11. Inteligencia artificial — `/api/ia`

### `POST /api/ia/analyze-tattoo` — JWT

Proxy del backend hacia **Google Gemini** (`gemini-2.5-flash`). La clave `GEMINI_API_KEY` **nunca**
sale del servidor.

**Body**

```json
{ "descripcion": "Un dragón japonés en el antebrazo, con olas y cerezos" }
```

| Campo | Validación |
|---|---|
| `descripcion` | string, **mínimo 10** y **máximo 2000** caracteres |

**201**

```json
{
  "respuesta": "{\"complejidad\":\"Alta\",\"tiempo\":\"4-6 horas\",\"precioMin\":700000,\"precioMax\":1200000,\"justificacion\":\"…\"}"
}
```

- `respuesta` es un **string** que contiene el JSON que devolvió el modelo (el frontend hace `JSON.parse`).
- Se exige JWT para que el endpoint no sea un proxy abierto (cada llamada cuesta dinero).

**Errores**

| Código | Cuándo |
|---|---|
| `400` | descripción vacía, < 10 o > 2000 caracteres |
| `401` | sin token / token inválido |
| `503` | falta `GEMINI_API_KEY` en el servidor |
| `500` | fallo de Google (mensaje genérico; el detalle nunca se filtra) |

---

## 12. Estático legacy — `/uploads`

```
GET /uploads/<archivo>   (público, FUERA del prefijo /api)
```

`useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' })`.

Solo se mantiene por compatibilidad con imágenes antiguas que apuntaran a `/uploads/...`. **Hoy no se
escribe nada ahí**: los binarios nuevos van a la BD. En Railway el disco es efímero, así que esos
archivos se pierden en cada redeploy.

---

## 13. Flujos clave

### 13.1 Publicar una imagen en la galería (2 pasos)

```
1) POST /api/galeria/upload        (JWT admin, multipart campo "imagen")
   ← { "url": "/api/imagenes/7", "id": 7 }

2) POST /api/galeria               (JWT admin, JSON)
   { "subido_por": 5, "empleado_id": 4, "imagen_url": "/api/imagenes/7", "titulo": "…", "estilo": "…" }
   ← fila de galeria con relaciones
```

El `<img>` del navegador carga `GET /api/imagenes/7` (público, cacheado 1 año).

### 13.2 Cambiar la foto de perfil

```
1) POST /api/usuarios/:id/foto    (JWT propio o admin, multipart campo "imagen")
   ← usuario con foto_perfil_url = "/api/imagenes/<nuevo id>"
   (el binario anterior se borra solo)
```

### 13.3 Convertir un usuario registrado en tatuador

```
1) POST /api/empleados            (JWT admin)  { "usuario_id": 5, "especialidad": "…" }
2) PATCH /api/usuarios/5/rol      (JWT admin)  { "rol": "empleado" }

3) POST /api/horarios-trabajador  (JWT)        franjas semanales del tatuador
```

Sin el paso 2 la persona aparece en el catálogo pero **no** tiene permisos de `empleado`.

### 13.4 Ejemplo con `curl.exe` (PowerShell 5.1)

```powershell
# Login
$r = curl.exe -s -X POST "http://localhost:3000/api/auth/login" `
  -H "Content-Type: application/json" `
  -d '{\"email\":\"kgcobo@gmail.com\",\"password\":\"tu-clave\"}' | ConvertFrom-Json
$t = $r.access_token

# Subir imagen (multipart)
curl.exe -s -X POST "http://localhost:3000/api/galeria/upload" `
  -H "Authorization: Bearer $t" `
  -F "imagen=@C:\ruta\foto.jpg"
```

---

## 14. Códigos de error globales

| Código | Significado en este API |
|---|---|
| `200` / `201` | OK / creado |
| `400` | `ValidationPipe` (campo desconocido, tipo/formato inválido, regla de negocio como `hora_fin <= hora_inicio`) |
| `401` | Sin token, token caducado/inválido, cuenta borrada o inactiva (`Sesión inválida`) |
| `403` | Autenticado sin el rol requerido, o intentando tocar recursos de otro usuario |
| `404` | `NotFoundException` de los servicios |
| `409` | Unicidad (`email` duplicado en registro **y** en `PATCH`, ficha de tatuador duplicada, cita/horario duplicado) o FK que impide borrar (tatuador con citas, usuario con galería) |
| `413` | Archivo > 5 MB |
| `500` | Fallo de Gemini o error inesperado (los casos de FK y de duplicados ya se traducen a 404/409) |
| `503` | Healthcheck sin BD / `GEMINI_API_KEY` ausente |

---

## 15. Endpoints que **NO** existen

No están implementados en este backend (no documentarlos ni llamarlos):

| Ruta inexistente | Nota |
|---|---|
| `POST /api/uploads` | Pertenece a la rama `dev-patino`, **no** está en este código |
| `/api/files/...` | Ídem (servido por `dev-patino`) |
| `/api/tatuadores` | El catálogo es `/api/empleados` |
| `/api/resenas` | Las reseñas viven en `localStorage` del frontend |
| `/api/auth/register` | El registro es `POST /api/usuarios` |
| `/api/auth/logout` | No hay revocación: el cliente borra el token |
| `/api/auth/refresh` | No hay refresh token; el JWT dura 1 h |
| Paginación / búsqueda | Ningún listado soporta `page`/`limit`/`q` |

---

## 16. Deuda técnica pendiente

**Corregido el 2026-10-25** (con tests de regresión):

- `citas` y `horarios-trabajador` ya usan el **select público** del usuario: dejaron de exponer
  `email` y `telefono` en listados públicos.
- Las FK inexistentes en `galeria` y `empleados` ahora dan **404** (antes 500).
- `POST /api/empleados` con ficha duplicada → **409**; `DELETE /api/empleados/:id` con citas u
  horarios → **409** con la alternativa `activo: false`.
- `PATCH /api/usuarios/:id` con email repetido → **409**.
- `DELETE /api/usuarios/:id` con fotos en galería → **409** (antes 500).
- `DELETE /api/imagenes/:id` ya **no** devuelve el binario.
- **Autorización por propietario** en citas y horarios (ver §9 y §10): el cliente dueño, el tatuador de
  la cita/ficha y el admin; el resto recibe **403**.
- `PATCH /api/usuarios/:id` con `foto_perfil_url` ahora **borra el binario anterior**, igual que
  `POST /:id/foto`.
- **`/api/projects` eliminado**: era el CRUD de ejemplo del CLI de Nest, sin guards ni uso real.
- Frontend `employees.ts` (repo `Ink-Creature`): al editar una ficha se cruza el rol real con
  `GET /api/usuarios`, así que un tatuador `admin` ya **no** se degrada a `empleado` al guardar.

**Sigue pendiente:**

1. **`IsImagenUrl()`** no acepta `/files/...` ni rutas de assets (`image/DBZ.jpg`): solo relevante si se
   integra la rama `dev-patino`; en ese caso ampliar el patrón en vez de sustituirlo.
2. **Horarios solapados**: el índice único solo corta el duplicado exacto (`empleado_id`, `dia_semana`,
   `hora_inicio`), no dos franjas que se pisan. Requiere validación en el servicio si se quiere impedir.
3. **Sin paginación** en ningún listado (`page`/`limit`/`q`): crecerá mal con muchos registros.

---

*Generado desde el código fuente en `OpenCode-try` (`NestJS/`). Si se añade o cambia una ruta, este
documento debe actualizarse a mano: no hay Swagger/OpenAPI en el proyecto.*
