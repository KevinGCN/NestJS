/**
 * Hash y verificación de contraseñas con `scrypt` (nativo de Node, sin
 * dependencias externas).
 *
 * Formato guardado en `usuarios.password_hash`:
 * `scrypt$16384$8$1$<salt hex>$<derived key hex>`
 * → algoritmo, N, r, p, sal y clave derivada. La sal aleatoria por usuario
 * impide tablas precalculadas; los parámetros van dentro del propio hash para
 * poder subirlos en el futuro sin invalidar las contraseñas viejas.
 *
 * `scripts/set-password.js` reproduce este mismo esquema: si cambia aquí, hay
 * que cambiarlo allí.
 */

import { promisify } from 'node:util';
import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from 'node:crypto';

const scrypt = promisify(scryptCallback);

export async function hashPassword(password: string): Promise<string> {
  // Sal nueva en cada hash: dos usuarios con la misma contraseña no comparten hash.
  const salt = randomBytes(16).toString('hex');

  const key = (await scrypt(password, salt, 64)) as Buffer;

  return `scrypt$16384$8$1$${salt}$${key.toString('hex')}`;
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  try {
    // Cualquier hash con formato desconocido (p. ej. bcrypt de una migración
    // vieja) se trata como "no coincide" en vez de romper el login.
    if (typeof hash !== 'string') {
      return false;
    }

    const match = /^scrypt\$16384\$8\$1\$([0-9a-f]{32})\$([0-9a-f]{128})$/.exec(
      hash,
    );

    if (!match) {
      return false;
    }

    const salt = match[1];
    const storedKey = Buffer.from(match[2], 'hex');

    const derivedKey = (await scrypt(password, salt, 64)) as Buffer;

    // Comparación en tiempo constante: `===` filtraría por temporización
    // cuántos bytes iniciales del hash acertó el atacante.
    return timingSafeEqual(derivedKey, storedKey);
  } catch {
    return false;
  }
}

// Hash con formato válido pero sin contraseña real detrás.
// Se usa cuando el email no existe, para no delatar por tiempo de respuesta
// si una cuenta existe o no (ver AuthService.login(), punto 8).
export const DUMMY_HASH = `scrypt$16384$8$1$${'0'.repeat(32)}$${'0'.repeat(128)}`;
