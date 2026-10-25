/**
 * Smoke test de `PrismaService`: comprueba que el módulo lo puede instanciar.
 *
 * No se llama a `onModuleInit`, así que no se abre conexión real contra
 * Postgres; solo se valida que el constructor (pool + adapter) no lanza.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  let service: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();

    service = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
