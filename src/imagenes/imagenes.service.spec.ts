/**
 * Pruebas de `ImagenesService`.
 *
 * Prisma se sustituye por un mock de jest.fn() para no tocar la base real: se
 * verifica la validación del archivo, la URL relativa que se devuelve y el
 * borrado por URL (incluido el caso de URLs externas, que no deben tocarse).
 */
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ImagenesService } from './imagenes.service';
import { PrismaService } from '../prisma/prisma.service';

/** Crea un archivo Multer falso con el buffer en memoria. */
function archivoFalso(
  nombre: string,
  mimetype: string,
  contenido = Buffer.from('bytes-de-imagen'),
): Express.Multer.File {
  return {
    fieldname: 'imagen',
    originalname: nombre,
    encoding: '7bit',
    mimetype,
    size: contenido.length,
    buffer: contenido,
    stream: undefined as never,
    destination: '',
    filename: '',
    path: '',
  };
}

/**
 * Primeros argumentos con los que se llamó a un mock. `jest.Mock` los tipa como
 * `any`, así que el tipo concreto se pide en el punto de uso para no perder el
 * chequeo (ni disparar `no-unsafe-member-access`).
 */
function argsDe<T>(mock: jest.Mock): T {
  const llamadas = mock.mock.calls as unknown[][];
  return llamadas[0][0] as T;
}

describe('ImagenesService', () => {
  let service: ImagenesService;
  let prisma: {
    imagenes: {
      create: jest.Mock;
      findUnique: jest.Mock;
      findMany: jest.Mock;
      delete: jest.Mock;
      deleteMany: jest.Mock;
    };
  };

  beforeEach(async () => {
    // Mock mínimo: solo los métodos de Prisma que usa el servicio.
    prisma = {
      imagenes: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImagenesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ImagenesService>(ImagenesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('guardar', () => {
    it('guarda el binario y devuelve la ruta "/api/imagenes/<id>"', async () => {
      prisma.imagenes.create.mockResolvedValue({
        id: 7,
        nombre: 'foto.jpg',
        mime_type: 'image/jpeg',
        tamano: 15,
        fecha_subida: new Date('2026-10-21'),
      });

      const resultado = await service.guardar(
        archivoFalso('foto.jpg', 'image/jpeg'),
      );

      expect(resultado.id).toBe(7);
      expect(resultado.url).toBe('/api/imagenes/7');
      expect(prisma.imagenes.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            mime_type: 'image/jpeg',
            tamano: 15,
          }),
        }),
      );
    });

    it('rechaza un tipo de imagen no permitido', async () => {
      await expect(
        service.guardar(archivoFalso('doc.pdf', 'application/pdf')),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.imagenes.create).not.toHaveBeenCalled();
    });

    it('rechaza un archivo vacío', async () => {
      await expect(
        service.guardar(
          archivoFalso('vacia.jpg', 'image/jpeg', Buffer.alloc(0)),
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('obtener', () => {
    it('lanza NotFoundException si la imagen no existe', async () => {
      prisma.imagenes.findUnique.mockResolvedValue(null);
      await expect(service.obtener(99)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('eliminar', () => {
    it('devuelve solo metadatos (nunca el binario `data`)', async () => {
      prisma.imagenes.findUnique.mockResolvedValue({
        id: 7,
        data: Buffer.from('x'),
      });
      prisma.imagenes.delete.mockResolvedValue({
        id: 7,
        nombre: 'foto.jpg',
        mime_type: 'image/jpeg',
        tamano: 4,
        fecha_subida: new Date('2026-10-21'),
      });

      const resultado = await service.eliminar(7);

      const args = argsDe<{
        where: { id: number };
        select?: Record<string, unknown>;
      }>(prisma.imagenes.delete);
      expect(args.where).toEqual({ id: 7 });
      expect(args.select).toEqual(
        expect.objectContaining({ id: true, nombre: true }),
      );
      expect(resultado).not.toHaveProperty('data');
    });

    it('responde 404 si la imagen no existe', async () => {
      prisma.imagenes.findUnique.mockResolvedValue(null);
      await expect(service.eliminar(99)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.imagenes.delete).not.toHaveBeenCalled();
    });
  });

  describe('eliminarPorUrl', () => {
    it('borra la fila de la tabla cuando la URL es del backend', async () => {
      const borrado = await service.eliminarPorUrl('/api/imagenes/12');

      expect(borrado).toBe(true);
      expect(prisma.imagenes.deleteMany).toHaveBeenCalledWith({
        where: { id: 12 },
      });
    });

    it('no toca la BD si la URL es externa', async () => {
      const borrado = await service.eliminarPorUrl(
        'https://ejemplo.com/foto.jpg',
      );

      expect(borrado).toBe(false);
      expect(prisma.imagenes.deleteMany).not.toHaveBeenCalled();
    });
  });
});
