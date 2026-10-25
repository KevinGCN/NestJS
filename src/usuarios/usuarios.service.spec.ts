/**
 * Pruebas de `UsuariosService`.
 *
 * Foco en los errores que antes salían como 500: un email duplicado en el PATCH
 * (P2002 → 409) y borrar una cuenta con fotos publicadas en la galería, que
 * Postgres bloquea por FK (P2003 → 409 con la acción a tomar).
 */
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UsuariosService } from './usuarios.service';
import { ImagenesService } from '../imagenes/imagenes.service';
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

const USUARIO = {
  id: 5,
  nombre: 'Kevin',
  apellido: 'Cobo',
  email: 'kgcobo@gmail.com',
  telefono: null,
  foto_perfil_url: '/api/imagenes/8',
  rol: 'admin',
  activo: true,
  fecha_registro: new Date('2026-08-26'),
  fecha_actualizacion: new Date('2026-10-21'),
};

describe('UsuariosService', () => {
  let service: UsuariosService;
  let prisma: {
    usuarios: {
      create: jest.Mock;
      findUnique: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };
  let imagenes: { eliminarPorUrl: jest.Mock };

  beforeEach(async () => {
    prisma = {
      usuarios: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    imagenes = { eliminarPorUrl: jest.fn().mockResolvedValue(true) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsuariosService,
        { provide: PrismaService, useValue: prisma },
        { provide: ImagenesService, useValue: imagenes },
      ],
    }).compile();

    service = module.get<UsuariosService>(UsuariosService);
  });

  describe('actualizar', () => {
    it('responde 409 si el correo ya está registrado (P2002)', async () => {
      prisma.usuarios.findUnique.mockResolvedValue(USUARIO);
      prisma.usuarios.update.mockRejectedValue({ code: 'P2002' });

      const error = service.actualizar(5, { email: 'otro@ejemplo.com' });

      await expect(error).rejects.toBeInstanceOf(ConflictException);
      await expect(error).rejects.toThrow(/otro@ejemplo\.com/);
    });

    it('actualiza el perfil sin tocar `rol` ni `activo`', async () => {
      prisma.usuarios.findUnique.mockResolvedValue(USUARIO);
      prisma.usuarios.update.mockResolvedValue({
        ...USUARIO,
        nombre: 'Kevin A.',
      });

      const resultado = await service.actualizar(5, { nombre: 'Kevin A.' });

      expect(resultado.nombre).toBe('Kevin A.');
      const args = argsDe<{ data: Record<string, unknown> }>(
        prisma.usuarios.update,
      );
      expect(args.data).not.toHaveProperty('rol');
    });

    it('borra el binario anterior si el PATCH cambia `foto_perfil_url`', async () => {
      prisma.usuarios.findUnique.mockResolvedValue(USUARIO);
      prisma.usuarios.update.mockResolvedValue({
        ...USUARIO,
        foto_perfil_url: '/api/imagenes/9',
      });

      await service.actualizar(5, { foto_perfil_url: '/api/imagenes/9' });

      // La fila anterior de `imagenes` se borra igual que en POST /:id/foto.
      expect(imagenes.eliminarPorUrl).toHaveBeenCalledWith('/api/imagenes/8');
    });

    it('no toca el binario si la foto sigue siendo la misma', async () => {
      prisma.usuarios.findUnique.mockResolvedValue(USUARIO);
      prisma.usuarios.update.mockResolvedValue(USUARIO);

      await service.actualizar(5, { foto_perfil_url: '/api/imagenes/8' });

      expect(imagenes.eliminarPorUrl).not.toHaveBeenCalled();
    });
  });

  describe('eliminar', () => {
    it('responde 409 si el usuario tiene galería (P2003)', async () => {
      prisma.usuarios.findUnique.mockResolvedValue(USUARIO);
      prisma.usuarios.delete.mockRejectedValue({ code: 'P2003' });

      const error = service.eliminar(5);

      await expect(error).rejects.toBeInstanceOf(ConflictException);
      await expect(error).rejects.toThrow(/galería/);
      // Si el borrado falla, la foto NO debe borrarse.
      expect(imagenes.eliminarPorUrl).not.toHaveBeenCalled();
    });

    it('borra la cuenta y su foto de perfil', async () => {
      prisma.usuarios.findUnique.mockResolvedValue(USUARIO);
      prisma.usuarios.delete.mockResolvedValue(USUARIO);

      await service.eliminar(5);

      expect(imagenes.eliminarPorUrl).toHaveBeenCalledWith('/api/imagenes/8');
    });
  });

  describe('obtenerUno', () => {
    it('responde 404 si el usuario no existe', async () => {
      prisma.usuarios.findUnique.mockResolvedValue(null);

      await expect(service.obtenerUno(99)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
