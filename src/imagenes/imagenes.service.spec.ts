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
      providers: [ImagenesService, { provide: PrismaService, useValue: prisma }],
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
        service.guardar(archivoFalso('vacia.jpg', 'image/jpeg', Buffer.alloc(0))),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('obtener', () => {
    it('lanza NotFoundException si la imagen no existe', async () => {
      prisma.imagenes.findUnique.mockResolvedValue(null);
      await expect(service.obtener(99)).rejects.toBeInstanceOf(NotFoundException);
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
      const borrado = await service.eliminarPorUrl('https://ejemplo.com/foto.jpg');

      expect(borrado).toBe(false);
      expect(prisma.imagenes.deleteMany).not.toHaveBeenCalled();
    });
  });
});
