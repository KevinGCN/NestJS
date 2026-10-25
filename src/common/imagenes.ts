import { unlink } from 'node:fs/promises';
import { basename, join } from 'node:path';

/**
 * Constantes y utilidades de imágenes.
 *
 * El almacenamiento actual es la BASE DE DATOS (tabla `proyecto7.imagenes`,
 * columna `data` BYTEA): ver el módulo `src/imagenes/`. Las imágenes se
 * sirven con GET /api/imagenes/:id y las URLs guardadas en la BD son
 * relativas ("/api/imagenes/<id>").
 *
 * El flujo legacy (archivos en `uploads/`) ya no escribe nada, pero se
 * mantiene `borrarImagen()` para limpiar imágenes antiguas cuando se
 * eliminan de la galería.
 */
export const UPLOADS_DIR = join(process.cwd(), 'uploads');
// 5 MB: el mismo límite que aplica Multer en el controlador. Corta subidas
// enormes antes de que ocupen memoria y espacio en la tabla.
export const IMAGEN_MAX_BYTES = 5 * 1024 * 1024;
// Solo formatos raster habituales (jpeg, png, webp). Se excluye SVG a
// propósito: puede llevar scripts y se serviría desde el mismo dominio de la API.
export const IMAGEN_TIPOS = /^image\/(jpeg|png|webp)$/;

/**
 * Ruta pública (relativa) con la que se sirve una imagen guardada en la BD.
 * Ej: "/api/imagenes/12"  ->  GET /api/imagenes/12
 */
export const IMAGENES_URL = '/api/imagenes';

/** Extrae el id de una ruta "/api/imagenes/<id>"; null si no corresponde. */
export function idDesdeUrlImagen(url?: string | null): number | null {
  if (!url) return null;
  const m = url.match(/^\/api\/imagenes\/(\d+)$/);
  return m ? Number(m[1]) : null;
}

/**
 * Borra el archivo legacy de una imagen que sigue en `/uploads/`.
 * No hace nada si la URL no corresponde a ese flujo.
 *
 * Es limpieza de compatibilidad: hoy los binarios viven en la BD, pero las
 * filas antiguas apuntan a archivos del disco. Se usa `basename()` para que
 * la URL no pueda salir del directorio `uploads/`, y el `catch` ignora el
 * caso de que el archivo ya no exista.
 */
export async function borrarImagen(url?: string | null) {
  if (!url?.startsWith('/uploads/')) return;
  await unlink(join(UPLOADS_DIR, basename(url))).catch(() => undefined);
}
