/**
 * Pruebas de `HorariosTrabajadorService`.
 *
 * Verifican la regla que el DTO no puede comprobar (hora_fin > hora_inicio), el
 * 404 de un tatuador inexistente, que el listado público use el select público
 * del usuario (sin email ni teléfono) y la autorización por recurso: la franja
 * solo la gestiona el tatuador dueño de la ficha (`empleados.usuario_id`) o un
 * admin; cualquier otro JWT recibe 403.
 */
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { HorariosTrabajadorService } from './horarios-trabajador.service';
import { PrismaService } from '../prisma/prisma.service';

const HORARIO_BASE = {
  empleado_id: 4,
  dia_semana: 2,
  hora_inicio: '09:00',
  hora_fin: '18:00',
};

// El usuario 5 es el dueño de la ficha 4 (tabla `empleados.usuario_id`).
const TATUADOR = { id: 5, rol: 'empleado' };
const OTRO_TATUADOR = { id: 7, rol: 'empleado' };
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

/** Franja tal como la devuelve `obtenerUno` (con `empleados.usuarios`). */
const HORARIO_GUARDADO = {
  id: 30,
  empleado_id: 4,
  dia_semana: 2,
  hora_inicio: new Date('1970-01-01T09:00:00.000Z'),
  hora_fin: new Date('1970-01-01T18:00:00.000Z'),
  empleados: { usuario_id: 5 },
};

describe('HorariosTrabajadorService', () => {
  let service: HorariosTrabajadorService;
  let prisma: {
    empleados: { findUnique: jest.Mock };
    horarios_trabajador: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      empleados: { findUnique: jest.fn() },
      horarios_trabajador: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HorariosTrabajadorService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<HorariosTrabajadorService>(HorariosTrabajadorService);
  });

  describe('crear', () => {
    it('rechaza hora_fin anterior o igual a hora_inicio', async () => {
      await expect(
        service.crear({ ...HORARIO_BASE, hora_fin: '09:00' }, TATUADOR),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.horarios_trabajador.create).not.toHaveBeenCalled();
    });

    it('responde 404 si el tatuador no existe', async () => {
      prisma.empleados.findUnique.mockResolvedValue(null);

      await expect(
        service.crear(HORARIO_BASE, TATUADOR),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.horarios_trabajador.create).not.toHaveBeenCalled();
    });

    it('responde 403 si la ficha es de otro tatuador', async () => {
      prisma.empleados.findUnique.mockResolvedValue({ id: 4, usuario_id: 5 });

      await expect(
        service.crear(HORARIO_BASE, OTRO_TATUADOR),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.horarios_trabajador.create).not.toHaveBeenCalled();
    });

    it('permite al tatuador dueño crear su franja', async () => {
      prisma.empleados.findUnique.mockResolvedValue({ id: 4, usuario_id: 5 });
      prisma.horarios_trabajador.create.mockResolvedValue({ id: 30 });

      await service.crear(HORARIO_BASE, TATUADOR);

      expect(prisma.horarios_trabajador.create).toHaveBeenCalledTimes(1);
    });

    it('permite al admin crear la franja de cualquier tatuador', async () => {
      prisma.empleados.findUnique.mockResolvedValue({ id: 4, usuario_id: 5 });
      prisma.horarios_trabajador.create.mockResolvedValue({ id: 30 });

      await service.crear(HORARIO_BASE, ADMIN);

      expect(prisma.horarios_trabajador.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('obtenerTodos', () => {
    it('usa select público del usuario (sin email ni teléfono)', async () => {
      prisma.horarios_trabajador.findMany.mockResolvedValue([]);

      await service.obtenerTodos({});

      const args = argsDe<{
        include: {
          empleados: { include: { usuarios: Record<string, unknown> } };
        };
      }>(prisma.horarios_trabajador.findMany);
      const usuarioRel = args.include.empleados.include.usuarios;
      expect(usuarioRel).toEqual({
        select: {
          id: true,
          nombre: true,
          apellido: true,
          foto_perfil_url: true,
        },
      });
      expect(usuarioRel).not.toHaveProperty('omit');
    });
  });

  describe('obtenerUno', () => {
    it('responde 404 si la franja no existe', async () => {
      prisma.horarios_trabajador.findUnique.mockResolvedValue(null);

      await expect(service.obtenerUno(99)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('actualizar', () => {
    it('responde 403 si la franja es de otro tatuador', async () => {
      prisma.horarios_trabajador.findUnique.mockResolvedValue(HORARIO_GUARDADO);

      await expect(
        service.actualizar(30, { hora_fin: '20:00' }, OTRO_TATUADOR),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.horarios_trabajador.update).not.toHaveBeenCalled();
    });

    it('permite al tatuador dueño mover su propia franja', async () => {
      prisma.horarios_trabajador.findUnique.mockResolvedValue(HORARIO_GUARDADO);
      prisma.horarios_trabajador.update.mockResolvedValue({ id: 30 });

      await service.actualizar(30, { hora_fin: '20:00' }, TATUADOR);

      expect(prisma.horarios_trabajador.update).toHaveBeenCalledTimes(1);
    });

    it('responde 403 al mover la franja a la ficha de otro tatuador', async () => {
      prisma.horarios_trabajador.findUnique.mockResolvedValue(HORARIO_GUARDADO);
      // El destino (ficha 8) pertenece al usuario 7, no al 5.
      prisma.empleados.findUnique.mockResolvedValue({ id: 8, usuario_id: 7 });

      await expect(
        service.actualizar(30, { empleado_id: 8 }, TATUADOR),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.horarios_trabajador.update).not.toHaveBeenCalled();
    });

    it('responde 404 si la ficha destino no existe', async () => {
      prisma.horarios_trabajador.findUnique.mockResolvedValue(HORARIO_GUARDADO);
      prisma.empleados.findUnique.mockResolvedValue(null);

      await expect(
        service.actualizar(30, { empleado_id: 99 }, TATUADOR),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('el admin sí puede mover la franja a otra ficha', async () => {
      prisma.horarios_trabajador.findUnique.mockResolvedValue(HORARIO_GUARDADO);
      prisma.empleados.findUnique.mockResolvedValue({ id: 8, usuario_id: 7 });
      prisma.horarios_trabajador.update.mockResolvedValue({ id: 30 });

      await service.actualizar(30, { empleado_id: 8 }, ADMIN);

      expect(prisma.horarios_trabajador.update).toHaveBeenCalledTimes(1);
    });
  });

  describe('eliminar', () => {
    it('responde 403 si la franja es de otro tatuador', async () => {
      prisma.horarios_trabajador.findUnique.mockResolvedValue(HORARIO_GUARDADO);

      await expect(service.eliminar(30, OTRO_TATUADOR)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.horarios_trabajador.delete).not.toHaveBeenCalled();
    });

    it('borra la franja si es del tatuador dueño', async () => {
      prisma.horarios_trabajador.findUnique.mockResolvedValue(HORARIO_GUARDADO);
      prisma.horarios_trabajador.delete.mockResolvedValue({ id: 30 });

      await service.eliminar(30, TATUADOR);

      const args = argsDe<{ where: { id: number }; include?: unknown }>(
        prisma.horarios_trabajador.delete,
      );
      expect(args.where).toEqual({ id: 30 });
      expect(args.include).toBeDefined();
    });

    it('borra la franja si quien llama es admin', async () => {
      prisma.horarios_trabajador.findUnique.mockResolvedValue(HORARIO_GUARDADO);
      prisma.horarios_trabajador.delete.mockResolvedValue({ id: 30 });

      await service.eliminar(30, ADMIN);

      expect(prisma.horarios_trabajador.delete).toHaveBeenCalledTimes(1);
    });
  });
});
