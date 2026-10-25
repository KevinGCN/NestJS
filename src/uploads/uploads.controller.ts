import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { randomUUID } from 'crypto';
import { mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import { extname, join } from 'path';

/** Carpeta donde se guardan las imágenes subidas (se sirven en /files). */
export const UPLOADS_DIR = join(process.cwd(), 'uploads');
mkdirSync(UPLOADS_DIR, { recursive: true });

@Controller('uploads')
export class UploadsController {
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: UPLOADS_DIR,
        filename: (_req, file, cb) =>
          cb(null, `${Date.now()}-${randomUUID()}${extname(file.originalname).toLowerCase()}`),
      }),
      limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
      fileFilter: (_req, file, cb) => {
        if (!/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) {
          return cb(new BadRequestException('Solo se permiten imágenes (jpg, png, webp, gif)'), false);
        }
        cb(null, true);
      },
    }),
  )
  subir(@UploadedFile() file?: { filename: string }) {
    if (!file) throw new BadRequestException('Falta el archivo (campo "file")');
    return { url: `/files/${file.filename}` };
  }
}
