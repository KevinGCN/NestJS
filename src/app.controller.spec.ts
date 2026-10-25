/**
 * Test unitario de `AppController`.
 *
 * No levanta HTTP ni Postgres: se construye el módulo de testing con `AppService`
 * real y un `PrismaService` falso, para poder probar también el healthcheck.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        // El healthcheck consulta la BD: se simula para no tocar Postgres.
        {
          provide: PrismaService,
          useValue: { $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]) },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });

  // El mock de `$queryRaw` resuelve, así que el controlador no debe lanzar
  // ServiceUnavailableException y devuelve el objeto de estado.
  describe('health', () => {
    it('responde ok cuando la base de datos contesta', async () => {
      const respuesta = await appController.health();
      expect(respuesta.status).toBe('ok');
      expect(respuesta.baseDeDatos).toBe('conectada');
    });
  });
});
