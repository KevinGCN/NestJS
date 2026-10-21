import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
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
      await this.prisma.$queryRaw`SELECT 1`;
    } catch (error) {
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
