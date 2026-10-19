const ZONA = process.env.APP_TIMEZONE ?? 'America/Bogota';

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

export const aMinutos = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

export const deMinutos = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

export const fechaADate = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
export const horaADate = (hhmm: string) => new Date(`1970-01-01T${hhmm}:00.000Z`);
export const dateAFecha = (d: Date) => d.toISOString().slice(0, 10);
export const dateAHora = (d: Date) => d.toISOString().slice(11, 16);
export const diaSemana = (iso: string) => fechaADate(iso).getUTCDay();

export function fechaValida(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const d = fechaADate(iso);
  return !Number.isNaN(d.getTime()) && dateAFecha(d) === iso;
}