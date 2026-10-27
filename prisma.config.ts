import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

/**
 * Prisma CLI (migrate deploy/status) y Prisma Studio NO se conectan con `pg`:
 * Studio habla con Postgres a través de `postgres.js`, que interpreta TODOS los
 * query params de la URL como parámetros de sesión del servidor. Los params que
 * solo existen para Prisma/node-postgres rompen la conexión:
 *
 *   42704: unrecognized configuration parameter "schema"
 *   42704: unrecognized configuration parameter "uselibpqcompat"
 *
 * Con ese error Studio muestra "Could not load schema metadata" y deja la lista
 * de tablas vacía, aunque la base esté perfectamente accesible (el runtime de la
 * app usa `pg`, que sí acepta esos params, y por eso la API funciona).
 *
 * - `schema`: Prisma ya lo sabe por `schema.prisma` (`schemas = ["proyecto7"]`).
 * - `uselibpqcompat`: solo lo entiende node-postgres (alias de sslmode).
 * - `options=-c search_path=proyecto7`: se conserva/asegura porque es un
 *   parámetro libpq real; sin él Studio abre en `public` (vacío) y el SQL
 *   manual (`prisma db execute`) escribiría en el esquema equivocado.
 *
 * El runtime NO pasa por aquí: `src/prisma/prisma.service.ts` lee
 * `process.env.DATABASE_URL` tal cual con `pg`.
 */
function urlParaCli(url: string): string {
  const [base, query = ''] = url.split('?');
  const params = new URLSearchParams(query);

  params.delete('schema');
  params.delete('uselibpqcompat');

  if (!params.has('options')) {
    params.set('options', '-c search_path=proyecto7');
  }

  // `URLSearchParams` codifica el espacio como "+"; postgres.js espera "%20"
  // (con "+" el parámetro llega literal y `search_path` no se aplica).
  const limpia = params.toString().replace(/\+/g, '%20');

  return limpia ? `${base}?${limpia}` : base;
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: urlParaCli(env('DATABASE_URL')),
  },
});
