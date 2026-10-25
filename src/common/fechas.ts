/**
 * Utilidades de fecha y hora del backend.
 *
 * Todo el dominio (horarios, citas, disponibilidad) usa dos representaciones
 * simples y sin husos horarios: `"YYYY-MM-DD"` y minutos desde medianoche.
 * Así las comparaciones son aritmética de enteros y no dependen del `TZ` del
 * servidor (Railway corre en UTC, el negocio en otra zona).
 */
// Zona del negocio: sin esto, "hoy" en el servidor (UTC) puede ser el día
// siguiente respecto a la hora local del estudio.
const ZONA = process.env.APP_TIMEZONE ?? 'America/Bogota';

/**
 * Fecha y minutos actuales ya trasladados a la zona del negocio.
 * Se usa `formatToParts` en vez de restar un offset fijo porque la zona
 * puede tener horario de verano.
 */
export function ahoraEnZona(): { fecha: string; minutos: number } {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const v = (tipo: string) => partes.find((p) => p.type === tipo)!.value;
  return {
    fecha: `${v('year')}-${v('month')}-${v('day')}`,
    minutos: Number(v('hour')) * 60 + Number(v('minute')),
  };
}

/** "HH:MM" → minutos desde medianoche (14:30 → 870), formato interno de horarios. */
export const aMinutos = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

/** Minutos desde medianoche → "HH:MM" con dos dígitos (870 → "14:30"). */
export const deMinutos = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

// Las conversiones a `Date` usan medianoche UTC a propósito: así
// `toISOString()` devuelve exactamente la misma fecha/hora que se guardó y
// nunca se desplaza un día por el huso del servidor.
export const fechaADate = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
export const horaADate = (hhmm: string) =>
  new Date(`1970-01-01T${hhmm}:00.000Z`);
export const dateAFecha = (d: Date) => d.toISOString().slice(0, 10);
export const dateAHora = (d: Date) => d.toISOString().slice(11, 16);
export const diaSemana = (iso: string) => fechaADate(iso).getUTCDay();

/**
 * Valida que el texto sea una fecha real en formato "YYYY-MM-DD".
 * No basta con la expresión regular: se reconstruye la fecha y se compara,
 * porque `new Date("2026-02-31")` no falla, sino que salta al 3 de marzo.
 */
export function fechaValida(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const d = fechaADate(iso);
  return !Number.isNaN(d.getTime()) && dateAFecha(d) === iso;
}
