import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { borrarImagen, idDesdeUrlImagen, IMAGENES_URL, IMAGEN_TIPOS } from '../common/imagenes';

export interface ImagenGuardada {
  id: number;
  nombre: string;
  mime_type: string;
  tamano: number;
  /** Ruta relativa servida por el backend: "/api/imagenes/<id>" */
  url: string;
  fecha_subida: Date;
}

/**
 * Servicio de imágenes — los binarios viven en la base de datos
 * (tabla `proyecto7.imagenes`, columna `data` BYTEA), no en el disco.
 *
 * Motivo: en Railway el sistema de archivos es efímero; si el archivo se
 * guardara en disco, al redesplegar las URLs de la galería quedarían rotas
 * mientras que la base de datos persiste.
 */
@Injectable()
export class ImagenesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Guarda el archivo en la BD y devuelve sus metadatos + la URL pública. */
  async guardar(archivo: Express.Multer.File): Promise<ImagenGuardada> {
    if (!archivo?.buffer?.length) {
      throw new BadRequestException('El archivo "imagen" está vacío');
    }
    if (!IMAGEN_TIPOS.test(archivo.mimetype)) {
      throw new BadRequestException('Tipo de imagen no permitido (jpeg, png o webp)');
    }

    const nombre = this.nombreLimpio(archivo.originalname, archivo.mimetype);

    const creada = await this.prisma.imagenes.create({
      data: {
        nombre,
        mime_type: archivo.mimetype,
        tamano: archivo.size ?? archivo.buffer.length,
        data: Buffer.from(archivo.buffer),
      },
    });

    return {
      id: creada.id,
      nombre: creada.nombre,
      mime_type: creada.mime_type,
      tamano: creada.tamano,
      url: `${IMAGENES_URL}/${creada.id}`,
      fecha_subida: creada.fecha_subida,
    };
  }

  /** Devuelve la imagen con su binario (o null si no existe). */
  async obtenerConDatos(id: number) {
    return this.prisma.imagenes.findUnique({ where: { id } });
  }

  /** Lista metadatos (sin el binario) para no gastar ancho de banda. */
  async listar() {
    return this.prisma.imagenes.findMany({
      select: {
        id: true,
        nombre: true,
        mime_type: true,
        tamano: true,
        fecha_subida: true,
      },
      orderBy: { fecha_subida: 'desc' },
    });
  }

  /** Elimina la imagen de la BD. */
  async eliminar(id: number) {
    await this.obtener(id);
    return this.prisma.imagenes.delete({ where: { id } });
  }

  async obtener(id: number) {
    const imagen = await this.obtenerConDatos(id);
    if (!imagen) {
      throw new NotFoundException(`Imagen con ID ${id} no encontrada`);
    }
    return imagen;
  }

  /**
   * Borra el archivo binario asociado a una URL guardada en la BD.
   *
   * - "/api/imagenes/<id>" → elimina la fila de la tabla `imagenes`.
   * - "/uploads/<file>"   → borra el archivo legacy del disco (ver `borrarImagen`).
   * - URL externa (http...) → no hay nada que borrar aquí.
   */
  async eliminarPorUrl(url?: string | null): Promise<boolean> {
    const id = idDesdeUrlImagen(url);
    if (id !== null) {
      await this.prisma.imagenes.deleteMany({ where: { id } });
      return true;
    }
    // Legacy: imágenes que quedaron en el disco con el flujo anterior.
    if (url?.startsWith('/uploads/')) {
      await borrarImagen(url);
      return true;
    }
    return false;
  }

  /** Nombre original saneado (sin rutas ni caracteres raros). */
  private nombreLimpio(originalname: string | undefined, mimetype: string): string {
    const extension = mimetype === 'image/png' ? '.png' : mimetype === 'image/webp' ? '.webp' : '.jpg';
    const base = (originalname ?? '')
      .split(/[\\/]/)
      .pop()!
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .slice(0, 120);
    return base.toLowerCase().endsWith(extension) ? base : `${base || 'imagen'}${extension}`;
  }
}
