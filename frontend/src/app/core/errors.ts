import { HttpErrorResponse } from '@angular/common/http';

/** Convierte un error HTTP (incluidos los de class-validator de Nest) en texto para la UI. */
export function mensajeError(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    const m = err.error?.message;
    if (Array.isArray(m)) return m.join(' · ');
    if (typeof m === 'string') return m;
    if (err.status === 0) return 'No se pudo conectar con el servidor';
  }
  return 'Ocurrió un error inesperado';
}
