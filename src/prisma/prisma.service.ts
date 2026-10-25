/**
 * Cliente Prisma de la aplicación.
 *
 * Extiende el `PrismaClient` generado (en `src/generated/prisma/`, no en
 * `node_modules`) y lo conecta a Postgres mediante el driver adapter
 * `@prisma/adapter-pg` sobre un `pg.Pool`.
 *
 * Notas de por qué así:
 * - Prisma 7 no trae driver propio: el adapter-pg es lo que permite usar `pg`
 *   (y por tanto el pool, que reutiliza conexiones en vez de abrir una por query).
 * - `rejectUnauthorized: false` es necesario contra Railway, cuyo certificado no
 *   está en la cadena de confianza de Node; la conexión sigue cifrada por TLS,
 *   solo se omite la validación del certificado (red interna/plataforma).
 * - El esquema no se elige aquí: las tablas viven en `proyecto7` y eso lo fija
 *   `DATABASE_URL` (`?options=-c search_path=proyecto7`) o `schema.prisma`.
 * - Los cycles de vida de Nest abren la conexión al arrancar y la cierran al
 *   apagar, para que `npm run start:dev` no deje conexiones colgadas.
 */

import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    // Un pool por proceso; Prisma toma las conexiones de aquí en cada query.
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false,
      },
    });

    const adapter = new PrismaPg(pool);

    // `super()` debe ir antes de tocar `this`; de ahí que el pool y el adapter
    // se construyan en variables locales y se pasen al cliente.
    super({ adapter });
  }

  /** Abre la conexión (y falla al arrancar si la BD no es alcanzable). */
  async onModuleInit() {
    await this.$connect();
  }

  /** Cierra el pool al apagar la app (SIGINT/SIGTERM o fin del test). */
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
