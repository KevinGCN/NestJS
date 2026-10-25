/**
 * Controlador raíz: `GET /api` (saludo) y `GET /api/health` (healthcheck).
 *
 * `@Controller()` sin argumento no aporta segmento a la ruta; el prefijo `/api`
 * lo pone `main.ts` con `setGlobalPrefix`.
 */

import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    // Se inyecta el cliente Prisma a propósito: el healthcheck necesita
    // comprobar la conexión real a Postgres, no solo que el proceso viva.
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  /**
   * Healthcheck del despliegue: GET /api/health
   *
   * Devuelve 200 si el API responde Y la base de datos de Railway contesta,
   * o 503 si la base de datos no responde. Es la forma más rápida de
   * comprobar que el frontend (Netlify) y el backend (Railway) se hablan.
   */
  @Get('health')
  async health() {
    const info = {
      status: 'ok',
      baseDeDatos: 'conectada',
      hora: new Date().toISOString(),
    };

    try {
      // `SELECT 1` es la consulta más barata que obliga a Postgres a responder:
      // si el pool de `pg` está caído o el host no contesta, esto lanza.
      await this.prisma.$queryRaw`SELECT 1`;
    } catch (error) {
      // 503 (no 500) para que Railway/monitores distingan "el API está vivo
      // pero la dependencia no" de un fallo del propio código.
      throw new ServiceUnavailableException({
        status: 'error',
        baseDeDatos: 'sin respuesta',
        detalle: error instanceof Error ? error.message : String(error),
        hora: info.hora,
      });
    }

    return info;
  }
}
