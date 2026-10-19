import { BadRequestException } from '@nestjs/common';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { randomUUID } from 'node:crypto';

export const UPLOADS_DIR = join(process.cwd(), 'uploads');
export const IMAGEN_MAX_BYTES = 5 * 1024 * 1024;
export const IMAGEN_TIPOS = /^image\/(jpeg|png|webp)$/;

const EXTENSION: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

//what is Multer?
export async function guardarImagen(archivo: Express.Multer.File): Promise<string> {
  const ext = EXTENSION[archivo.mimetype];
  if (!ext) throw new BadRequestException('Tipo de imagen no permitido');
  const nombre = `${randomUUID()}${ext}`;
  await mkdir(UPLOADS_DIR, { recursive: true });
  await writeFile(join(UPLOADS_DIR, nombre), archivo.buffer);
  return `/uploads/${nombre}`;
}

export async function borrarImagen(url?: string | null) {
  if (!url?.startsWith('/uploads/')) return;
  await unlink(join(UPLOADS_DIR, basename(url))).catch(() => undefined);
}