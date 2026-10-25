/**
 * Pruebas de `EmpleadosService`.
 *
 * Foco en los errores que antes salían como 500: usuario inexistente al crear
 * la ficha (ahora 404), ficha duplicada (P2002 → 409) y borrado de un tatuador
 * con citas u horarios (P2003 → 409 con la alternativa `activo: false`).
 */
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EmpleadosService } from './empleados.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Primeros argumentos con los que se llamó a un mock. `jest.Mock` los tipa como
 * `any`, así que el tipo concreto se pide en el punto de uso para no perder el
 * chequeo (ni disparar `no-unsafe-member-access`).
 */
function argsDe<T>(mock: jest.Mock): T {
  const llamadas = mock.mock.calls as unknown[][];
  return llamadas[0][0] as T;
}

describe('EmpleadosService', () => {
  let service: EmpleadosService;
  let prisma: {
    usuarios: { findUnique: jest.Mock };
    empleados: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      usuarios: { findUnique: jest.fn() },
      empleados: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmpleadosService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<EmpleadosService>(EmpleadosService);
  });

  describe('crear', () => {
    it('responde 404 si el usuario no existe', async () => {
      prisma.usuarios.findUnique.mockResolvedValue(null);

      await expect(service.crear({ usuario_id: 99 })).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.empleados.create).not.toHaveBeenCalled();
    });

    it('responde 409 si el usuario ya tiene ficha (P2002)', async () => {
      prisma.usuarios.findUnique.mockResolvedValue({ id: 5 });
      prisma.empleados.create.mockRejectedValue({ code: 'P2002' });

      await expect(service.crear({ usuario_id: 5 })).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('crea la ficha con activo=true por defecto', async () => {
      prisma.usuarios.findUnique.mockResolvedValue({ id: 5 });
      prisma.empleados.create.mockResolvedValue({ id: 9, activo: true });

      const resultado = await service.crear({ usuario_id: 5 });

      expect(resultado).toEqual({ id: 9, activo: true });
      const args = argsDe<{ data: { usuario_id?: number; activo?: boolean } }>(
        prisma.empleados.create,
      );
      expect(args.data).toEqual(
        expect.objectContaining({ usuario_id: 5, activo: true }),
      );
    });
  });

  describe('obtenerUno', () => {
    it('responde 404 si la ficha no existe', async () => {
      prisma.empleados.findUnique.mockResolvedValue(null);

      await expect(service.obtenerUno(99)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('eliminar', () => {
    it('responde 409 si el tatuador tiene citas u horarios (P2003)', async () => {
      prisma.empleados.findUnique.mockResolvedValue({ id: 4 });
      prisma.empleados.delete.mockRejectedValue({ code: 'P2003' });

      const error = service.eliminar(4);
      await expect(error).rejects.toBeInstanceOf(ConflictException);
      await expect(error).rejects.toThrow(/activo: false/);
    });

    it('borra la ficha cuando no hay dependencias', async () => {
      prisma.empleados.findUnique.mockResolvedValue({ id: 4 });
      prisma.empleados.delete.mockResolvedValue({ id: 4 });

      await expect(service.eliminar(4)).resolves.toEqual({ id: 4 });
    });
  });
});
