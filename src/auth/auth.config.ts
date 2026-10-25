/**
 * Configuración del JWT, resuelta desde el entorno al importar el módulo.
 *
 * Se lee con `requerido()` para fallar en el arranque (fail fast): es preferible
 * que el API no levante a que firme tokens con un secreto `undefined` o con un
 * valor por defecto conocido. En Railway `JWT_SECRET` es una variable del
 * servicio; en local va en `NestJS/.env`.
 */

function requerido(nombre: string): string {
  const valor = process.env[nombre];
  if (!valor) {
    throw new Error(`Falta la variable de entorno ${nombre}`);
  }
  return valor;
}

export const jwtConfig = {
  // Sin JWT_SECRET esto lanza "Falta la variable de entorno JWT_SECRET" y el
  // proceso no arranca (por eso dotenv debe cargarse antes en main.ts).
  secret: requerido('JWT_SECRET'),
  // 1 hora por defecto, expresada en el formato de `jsonwebtoken` ('3600s').
  expiresIn: process.env.JWT_EXPIRES_IN ?? '3600s',
};