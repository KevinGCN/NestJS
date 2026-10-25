/** Forma que devuelve el backend (tabla empleados + su usuario). */
export interface EmpleadoApi {
  id: number;
  usuario_id: number;
  especialidad: string | null;
  biografia: string | null;
  fecha_contratacion: string;
  activo: boolean;
  usuarios?: { id: number; nombre: string; apellido: string; foto_perfil_url: string | null };
  // Aún no existen en la DB; si algún día se agregan columnas, la UI los mostrará sola.
  experiencia?: number;
  estrellas?: number;
}

/** Forma que usa la interfaz. */
export interface Tatuador {
  id: number;
  usuarioId: number;
  nombrePila: string;
  apellido: string;
  nombre: string; // nombre completo
  cargo: string;
  especialidad: string;
  descripcion: string;
  foto: string;
  activo: boolean;
  desde: number; // año de ingreso al estudio
  experiencia?: number;
  estrellas?: number;
}

/** Datos del formulario de alta/edición. */
export interface DatosTatuador {
  nombre: string;
  apellido: string;
  email: string;
  especialidad: string;
  descripcion: string;
  foto: string;
}

export const FOTO_POR_DEFECTO = 'image/tatuador.png';

export function aTatuador(e: EmpleadoApi): Tatuador {
  const u = e.usuarios;
  return {
    id: e.id,
    usuarioId: e.usuario_id,
    nombrePila: u?.nombre ?? '',
    apellido: u?.apellido ?? '',
    nombre: `${u?.nombre ?? ''} ${u?.apellido ?? ''}`.trim(),
    cargo: 'Tatuador',
    especialidad: e.especialidad ?? '',
    descripcion: e.biografia ?? '',
    foto: u?.foto_perfil_url || FOTO_POR_DEFECTO,
    activo: e.activo,
    desde: new Date(e.fecha_contratacion).getFullYear(),
    experiencia: e.experiencia,
    estrellas: e.estrellas,
  };
}
