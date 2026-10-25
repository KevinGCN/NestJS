/**
 * Configuración del JWT, resuelta desde el entorno al importar el módulo.
 *
 * Se lee con `requerido()` para fallar en el arranque (fail fast): es preferible
 * que el API no levante a que firme tokens con un secreto `undefined` o con un
 * valor por defecto conocido. En Railway `JWT_SECRET` es una variable del
 * servicio; en local va en `NestJS/.env`.
 */

import type { JwtSignOptions } from '@nestjs/jwt';

function requerido(nombre: string): string {
  const valor = process.env[nombre];
  if (!valor) {
    throw new Error(`Falta la variable de entorno ${nombre}`);
  }
  return valor;
}

export const jwtConfig: {
  secret: string;
  // `jsonwebtoken` no acepta un `string` cualquiera: exige el formato de `ms`
  // ('3600s', '1h'…). El valor viene del entorno, así que el cast se hace aquí,
  // una sola vez, en vez de repetir `as any` en `JwtModule.register`.
  expiresIn: JwtSignOptions['expiresIn'];
} = {
  // Sin JWT_SECRET esto lanza "Falta la variable de entorno JWT_SECRET" y el
  // proceso no arranca (por eso dotenv debe cargarse antes en main.ts).
  secret: requerido('JWT_SECRET'),
  // 1 hora por defecto, expresada en el formato de `jsonwebtoken` ('3600s').
  expiresIn: (process.env.JWT_EXPIRES_IN ??
    '3600s') as JwtSignOptions['expiresIn'],
};
