/**
 * Pruebas de `CitasService`.
 *
 * Cubren las reglas de negocio que el DTO no puede validar (orden de las horas,
 * existencia de las FK y hueco duplicado), la forma del listado (relaciones con
 * `select` público, nunca `omit`) y la autorización por recurso añadida: el
 * cliente dueño, el tatuador de la cita y el admin; el resto recibe 403.
 */
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CitasService } from './citas.service';
import { PrismaService } from '../prisma/prisma.service';

const CITA_BASE = {
  usuario_id: 3,
  empleado_id: 1,
  fecha: '2026-11-02',
  hora_inicio: '14:00',
  hora_fin: '16:00',
};

const CLIENTE = { id: 3, rol: 'cliente' };
const OTRO_CLIENTE = { id: 9, rol: 'cliente' };
const TATUADOR = { id: 5, rol: 'empleado' };
const ADMIN = { id: 1, rol: 'admin' };

/**
 * Primeros argumentos con los que se llamó a un mock. `jest.Mock` los tipa como
 * `any`, así que el tipo concreto se pide en el punto de uso para no perder el
 * chequeo (ni disparar `no-unsafe-member-access`).
 */
function argsDe<T>(mock: jest.Mock): T {
  const llamadas = mock.mock.calls as unknown[][];
  return llamadas[0][0] as T;
}

/** Cita tal como la devuelve `obtenerUno` (con la relación `empleados`). */
const CITA_GUARDADA = {
  id: 20,
  usuario_id: 3,
  empleado_id: 1,
  hora_inicio: new Date('1970-01-01T14:00:00.000Z'),
  hora_fin: new Date('1970-01-01T16:00:00.000Z'),
  empleados: { usuario_id: 5 },
};

describe('CitasService', () => {
  let service: CitasService;
  let prisma: {
    usuarios: { findUnique: jest.Mock };
    empleados: { findUnique: jest.Mock };
    citas: {
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
      empleados: { findUnique: jest.fn() },
      citas: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [CitasService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<CitasService>(CitasService);
  });

  describe('crear', () => {
    it('rechaza hora_fin anterior o igual a hora_inicio', async () => {
      await expect(
        service.crear({ ...CITA_BASE, hora_fin: '14:00' }, CLIENTE),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.citas.create).not.toHaveBeenCalled();
    });

    it('rechaza reservar a nombre de otro usuario (403)', async () => {
      await expect(
        service.crear(CITA_BASE, OTRO_CLIENTE),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.citas.create).not.toHaveBeenCalled();
    });

    it('permite al admin reservar para cualquier usuario', async () => {
      prisma.usuarios.findUnique.mockResolvedValue({ id: 3 });
      prisma.empleados.findUnique.mockResolvedValue({ id: 1 });
      prisma.citas.create.mockResolvedValue({ id: 20 });

      await service.crear(CITA_BASE, ADMIN);

      expect(prisma.citas.create).toHaveBeenCalledTimes(1);
    });

    it('responde 404 si el usuario no existe', async () => {
      prisma.usuarios.findUnique.mockResolvedValue(null);
      prisma.empleados.findUnique.mockResolvedValue({ id: 1 });

      await expect(service.crear(CITA_BASE, CLIENTE)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.citas.create).not.toHaveBeenCalled();
    });

    it('responde 404 si el tatuador no existe', async () => {
      prisma.usuarios.findUnique.mockResolvedValue({ id: 3 });
      prisma.empleados.findUnique.mockResolvedValue(null);

      await expect(service.crear(CITA_BASE, CLIENTE)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('responde 409 cuando el hueco ya está ocupado (P2002)', async () => {
      prisma.usuarios.findUnique.mockResolvedValue({ id: 3 });
      prisma.empleados.findUnique.mockResolvedValue({ id: 1 });
      prisma.citas.create.mockRejectedValue({ code: 'P2002' });

      await expect(service.crear(CITA_BASE, CLIENTE)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('crea la cita con estado pendiente por defecto', async () => {
      prisma.usuarios.findUnique.mockResolvedValue({ id: 3 });
      prisma.empleados.findUnique.mockResolvedValue({ id: 1 });
      prisma.citas.create.mockResolvedValue({ id: 20, estado: 'pendiente' });

      const resultado = await service.crear(CITA_BASE, CLIENTE);

      expect(resultado).toEqual({ id: 20, estado: 'pendiente' });
      const args = argsDe<{ data: { estado?: string } }>(prisma.citas.create);
      expect(args.data).toEqual(
        expect.objectContaining({ estado: 'pendiente' }),
      );
    });
  });

  describe('obtenerTodos', () => {
    it('usa select público del usuario (sin email ni teléfono)', async () => {
      prisma.citas.findMany.mockResolvedValue([]);

      await service.obtenerTodos({});

      const args = argsDe<{
        include: {
          usuarios: Record<string, unknown>;
          empleados: { include: { usuarios: Record<string, unknown> } };
        };
      }>(prisma.citas.findMany);
      expect(args.include.usuarios).toEqual({
        select: {
          id: true,
          nombre: true,
          apellido: true,
          foto_perfil_url: true,
        },
      });
      expect(args.include.usuarios).not.toHaveProperty('omit');
      expect(args.include.empleados.include.usuarios).not.toHaveProperty(
        'omit',
      );
    });

    it('ignora filtros que no sean números', async () => {
      prisma.citas.findMany.mockResolvedValue([]);

      await service.obtenerTodos({
        usuario_id: undefined,
        empleado_id: undefined,
      });

      const args = argsDe<{ where: Record<string, unknown> }>(
        prisma.citas.findMany,
      );
      expect(args.where).toEqual({});
    });
  });

  describe('obtenerUno', () => {
    it('responde 404 si la cita no existe', async () => {
      prisma.citas.findUnique.mockResolvedValue(null);
      await expect(service.obtenerUno(99)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('actualizar', () => {
    it('responde 403 si la cita es de otro cliente', async () => {
      prisma.citas.findUnique.mockResolvedValue(CITA_GUARDADA);

      await expect(
        service.actualizar(20, { estado: 'cancelada' }, OTRO_CLIENTE),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.citas.update).not.toHaveBeenCalled();
    });

    it('permite al cliente dueño cambiar el estado', async () => {
      prisma.citas.findUnique.mockResolvedValue(CITA_GUARDADA);
      prisma.citas.update.mockResolvedValue({ id: 20, estado: 'cancelada' });

      await service.actualizar(20, { estado: 'cancelada' }, CLIENTE);

      expect(prisma.citas.update).toHaveBeenCalledTimes(1);
    });

    it('permite al tatuador de la cita gestionarla', async () => {
      prisma.citas.findUnique.mockResolvedValue(CITA_GUARDADA);
      prisma.citas.update.mockResolvedValue({ id: 20 });

      await service.actualizar(20, { estado: 'completada' }, TATUADOR);

      expect(prisma.citas.update).toHaveBeenCalledTimes(1);
    });

    it('solo el admin puede reasignar la cita a otro usuario', async () => {
      prisma.citas.findUnique.mockResolvedValue(CITA_GUARDADA);

      await expect(
        service.actualizar(20, { usuario_id: 9 }, CLIENTE),
      ).rejects.toBeInstanceOf(ForbiddenException);

      prisma.usuarios.findUnique.mockResolvedValue({ id: 9 });
      prisma.empleados.findUnique.mockResolvedValue({ id: 1 });
      prisma.citas.update.mockResolvedValue({ id: 20 });

      await service.actualizar(20, { usuario_id: 9 }, ADMIN);
      expect(prisma.citas.update).toHaveBeenCalledTimes(1);
    });
  });

  describe('eliminar', () => {
    it('responde 403 si la cita es de otro cliente', async () => {
      prisma.citas.findUnique.mockResolvedValue(CITA_GUARDADA);

      await expect(service.eliminar(20, OTRO_CLIENTE)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.citas.delete).not.toHaveBeenCalled();
    });

    it('borra la cita si el cliente es el dueño', async () => {
      prisma.citas.findUnique.mockResolvedValue(CITA_GUARDADA);
      prisma.citas.delete.mockResolvedValue({ id: 20 });

      await service.eliminar(20, CLIENTE);

      const args = argsDe<{ where: { id: number }; include?: unknown }>(
        prisma.citas.delete,
      );
      expect(args.where).toEqual({ id: 20 });
      expect(args.include).toBeDefined();
    });

    it('borra la cita si quien llama es admin', async () => {
      prisma.citas.findUnique.mockResolvedValue(CITA_GUARDADA);
      prisma.citas.delete.mockResolvedValue({ id: 20 });

      await service.eliminar(20, ADMIN);

      expect(prisma.citas.delete).toHaveBeenCalledTimes(1);
    });
  });
});
