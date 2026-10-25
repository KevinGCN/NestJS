/**
 * Pruebas de `GaleriaService`.
 *
 * Cubren los dos errores corregidos: las FK inexistentes ya no revientan como
 * 500 (se validan antes de escribir → 404) y el borrado sigue limpiando el
 * binario asociado.
 */
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { GaleriaService } from './galeria.service';
import { ImagenesService } from '../imagenes/imagenes.service';
import { PrismaService } from '../prisma/prisma.service';

describe('GaleriaService', () => {
  let service: GaleriaService;
  let prisma: {
    usuarios: { findUnique: jest.Mock };
    empleados: { findUnique: jest.Mock };
    galeria: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };
  let imagenes: { eliminarPorUrl: jest.Mock };

  beforeEach(async () => {
    prisma = {
      usuarios: { findUnique: jest.fn() },
      empleados: { findUnique: jest.fn() },
      galeria: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    imagenes = { eliminarPorUrl: jest.fn().mockResolvedValue(true) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GaleriaService,
        { provide: PrismaService, useValue: prisma },
        { provide: ImagenesService, useValue: imagenes },
      ],
    }).compile();

    service = module.get<GaleriaService>(GaleriaService);
  });

  describe('crear', () => {
    it('responde 404 si el usuario que sube no existe', async () => {
      prisma.usuarios.findUnique.mockResolvedValue(null);

      await expect(
        service.crear({ subido_por: 99, imagen_url: '/api/imagenes/1' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.galeria.create).not.toHaveBeenCalled();
    });

    it('responde 404 si el tatuador atribuido no existe', async () => {
      prisma.usuarios.findUnique.mockResolvedValue({ id: 1 });
      prisma.empleados.findUnique.mockResolvedValue(null);

      await expect(
        service.crear({
          subido_por: 1,
          empleado_id: 99,
          imagen_url: '/api/imagenes/1',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.galeria.create).not.toHaveBeenCalled();
    });

    it('crea la fila cuando las FK existen', async () => {
      prisma.usuarios.findUnique.mockResolvedValue({ id: 1 });
      prisma.empleados.findUnique.mockResolvedValue({ id: 2 });
      prisma.galeria.create.mockResolvedValue({ id: 10 });

      const resultado = await service.crear({
        subido_por: 1,
        empleado_id: 2,
        imagen_url: '/api/imagenes/1',
      });

      expect(resultado).toEqual({ id: 10 });
      expect(prisma.galeria.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('actualizar', () => {
    it('no consulta las FK si el PATCH no las toca', async () => {
      prisma.galeria.findUnique.mockResolvedValue({
        id: 10,
        subido_por: 1,
        empleado_id: 2,
        imagen_url: '/api/imagenes/1',
      });
      prisma.galeria.update.mockResolvedValue({ id: 10 });

      await service.actualizar(10, { titulo: 'Nuevo título' });

      expect(prisma.usuarios.findUnique).not.toHaveBeenCalled();
      expect(prisma.galeria.update).toHaveBeenCalledTimes(1);
    });

    it('responde 404 si se reasigna a un usuario inexistente', async () => {
      prisma.galeria.findUnique.mockResolvedValue({
        id: 10,
        subido_por: 1,
        empleado_id: null,
        imagen_url: '/api/imagenes/1',
      });
      prisma.usuarios.findUnique.mockResolvedValue(null);

      await expect(
        service.actualizar(10, { subido_por: 99 }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.galeria.update).not.toHaveBeenCalled();
    });
  });

  describe('eliminar', () => {
    it('borra la fila y su binario', async () => {
      prisma.galeria.findUnique.mockResolvedValue({
        id: 10,
        subido_por: 1,
        empleado_id: null,
        imagen_url: '/api/imagenes/7',
      });
      prisma.galeria.delete.mockResolvedValue({ id: 10 });

      await service.eliminar(10);

      expect(prisma.galeria.delete).toHaveBeenCalledWith({ where: { id: 10 } });
      expect(imagenes.eliminarPorUrl).toHaveBeenCalledWith('/api/imagenes/7');
    });
  });
});
