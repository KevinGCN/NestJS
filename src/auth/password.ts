import { promisify } from 'node:util';
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';

const scrypt = promisify(scryptCallback);

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');

  const key = (await scrypt(password, salt, 64)) as Buffer;

  return `scrypt$16384$8$1$${salt}$${key.toString('hex')}`;
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  try {
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

    return timingSafeEqual(derivedKey, storedKey);
  } catch {
    return false;
  }
}

// Hash con formato válido pero sin contraseña real detrás.
// Se usa cuando el email no existe, para no delatar por tiempo de respuesta
// si una cuenta existe o no (ver AuthService.login(), punto 8).
export const DUMMY_HASH = `scrypt$16384$8$1$${'0'.repeat(32)}$${'0'.repeat(128)}`;