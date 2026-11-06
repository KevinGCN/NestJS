import { createPublicKey } from 'node:crypto';
import { verify, type JwtPayload } from 'jsonwebtoken';

/**
 * Verificación de ID tokens de Firebase sin `firebase-admin`.
 *
 * Firebase firma los tokens con las claves públicas de
 * `securetoken@system.gserviceaccount.com`. Descargamos el JWKS, buscamos la
 * clave por `kid` y verificamos firma, emisor, audiencia y expiración.
 */

const JWKS_URL =
  'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';

/** Las claves de Google rotan poco; cachearlas evita una descarga por login. */
const CACHE_MS = 60 * 60 * 1000;

export interface FirebasePayload extends JwtPayload {
  email?: string;
  email_verified?: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
}

interface Jwk {
  kid?: string;
  [key: string]: unknown;
}

let cache: { at: number; keys: Jwk[] } | null = null;

async function obtenerClaves(): Promise<Jwk[]> {
  if (cache && Date.now() - cache.at < CACHE_MS) {
    return cache.keys;
  }

  const respuesta = await fetch(JWKS_URL);
  if (!respuesta.ok) {
    throw new Error(
      `No se pudieron descargar las claves de Firebase (${respuesta.status})`,
    );
  }

  const datos = (await respuesta.json()) as { keys?: Jwk[] };
  cache = { at: Date.now(), keys: datos.keys ?? [] };
  return cache.keys;
}

export async function verificarTokenFirebase(
  idToken: string,
  projectId: string,
): Promise<FirebasePayload> {
  const partes = idToken.split('.');
  if (partes.length !== 3) {
    throw new Error('Token mal formado');
  }

  const cabecera = JSON.parse(
    Buffer.from(partes[0], 'base64url').toString('utf8'),
  ) as { kid?: string };
  if (!cabecera.kid) {
    throw new Error('Token sin kid');
  }

  const claves = await obtenerClaves();
  const jwk = claves.find((k) => k.kid === cabecera.kid);
  if (!jwk) {
    throw new Error('Clave de firma desconocida');
  }

  // El JWK ya viene validado por Google; `createPublicKey` lo convierte a PEM.
  const publicKey = createPublicKey({
    key: jwk as never,
    format: 'jwk',
  }).export({ type: 'spki', format: 'pem' });

  return verify(idToken, publicKey, {
    algorithms: ['RS256'],
    audience: projectId,
    issuer: `https://securetoken.google.com/${projectId}`,
  }) as FirebasePayload;
}
