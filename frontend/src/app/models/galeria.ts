export interface GaleriaApi {
  id: number;
  subido_por: number;
  empleado_id: number | null;
  imagen_url: string;
  titulo: string | null;
}

/** Forma que usa la interfaz (misma que tenía imagenesBase). */
export interface ImagenGaleria {
  id: number;
  src: string;
  alt: string;
  empleadoId: number | null;
}

export function aImagen(g: GaleriaApi): ImagenGaleria {
  return { id: g.id, src: g.imagen_url, alt: g.titulo || 'Tatuaje', empleadoId: g.empleado_id };
}
