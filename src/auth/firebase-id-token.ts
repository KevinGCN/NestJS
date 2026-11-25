/**
 * Verification of Firebase Authentication ID tokens for `POST /auth/google`.
 *
 * The SPA signs the user in with the Firebase client SDK and sends the ID
 * token here; the backend verifies it WITHOUT the firebase-admin SDK:
 *
 * - firebase-admin would need a service-account JSON secret; verifying the
 *   JWT against Google's public x509 certificates only needs the (public)
 *   project id, so nothing sensitive has to be configured per environment
 *   beyond `FIREBASE_PROJECT_ID`.
 * - The certificates come from
 *   https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com
 *   and rotate about every day; they are cached in memory for one hour so we
 *   do not hit that endpoint on every login.
 *
 * `FIREBASE_PROJECT_ID` is read at call time (like GEMINI_API_KEY): the API
 * boots fine without it and `POST /auth/google` answers 503 until configured.
 *
 * A valid result carries the Google identity: `sub` (Firebase uid), `email`,
 * `email_verified`, and optionally `name` and `picture`.
 */

import { ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import * as https from 'https';

const CERTIFICADOS_URL =
  'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

// googleapis.com certificates rotate (recommended cache: <24h); one hour is
// a safe middle ground between freshness and fewer outbound requests.
const TTL_CERTIFICADOS_MS = 60 * 60 * 1000;

export interface ClaimsFirebase {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
  picture?: string;
}

let cacheCertificados: { claves: Record<string, string>; expira: number } | null = null;

/** Fetches and caches Google's current x509 certificates (kid -> PEM). */
function obtenerCertificados(): Promise<Record<string, string>> {
  if (cacheCertificados && cacheCertificados.expira > Date.now()) {
    return Promise.resolve(cacheCertificados.claves);
  }

  return new Promise((resolve, reject) => {
    https
      .get(CERTIFICADOS_URL, (respuesta) => {
        if (respuesta.statusCode !== 200) {
          respuesta.resume();
          reject(new ServiceUnavailableException('No se pudieron obtener los certificados de Google'));
          return;
        }

        let cuerpo = '';
        respuesta.on('data', (pedazo: Buffer) => (cuerpo += pedazo.toString()));
        respuesta.on('end', () => {
          try {
            const claves = JSON.parse(cuerpo) as Record<string, string>;
            cacheCertificados = { claves, expira: Date.now() + TTL_CERTIFICADOS_MS };
            resolve(claves);
          } catch {
            reject(new ServiceUnavailableException('Respuesta invalida de los certificados de Google'));
          }
        });
      })
      .on('error', () => reject(new ServiceUnavailableException('No se pudo contactar a Google')));
  });
}

/**
 * Verifies a Firebase ID token and returns its claims, or throws
 * `UnauthorizedException` for any token we do not accept (bad signature,
 * wrong project, expired, wrong issuer...).
 */
export async function verificarIdTokenFirebase(idToken: string): Promise<ClaimsFirebase> {
  const projectId = process.env.FIREBASE_PROJECT_ID;

  if (!projectId) {
    // Deliberately 503 and not 401: it is a server misconfiguration, not bad
    // client input (same convention as the Gemini key).
    throw new ServiceUnavailableException(
      'El inicio de sesion con Google no esta configurado en el servidor',
    );
  }

  // First grab the header to pick the certificate matching the token `kid`;
  // then verify signature + audience + issuer + expiry in one verify() call.
  const decodificado = jwt.decode(idToken, { complete: true });
  const kid = decodificado?.header?.kid;

  if (typeof kid !== 'string' || !kid) {
    throw new UnauthorizedException('Token de Google invalido o expirado');
  }

  const claves = await obtenerCertificados();
  const pem = claves[kid];

  if (!pem) {
    // Unknown kid: rotated certs or a forged token; force a cache refresh on
    // the next attempt in case rotation happened inside the cache window.
    cacheCertificados = null;
    throw new UnauthorizedException('Token de Google invalido o expirado');
  }

  try {
    const claims = jwt.verify(idToken, pem, {
      algorithms: ['RS256'],
      audience: projectId,
      issuer: `https://securetoken.google.com/${projectId}`,
    }) as jwt.JwtPayload;

    return {
      sub: String(claims.sub),
      email: String(claims.email ?? ''),
      email_verified: claims.email_verified === true,
      name: typeof claims.name === 'string' ? claims.name : undefined,
      picture: typeof claims.picture === 'string' ? claims.picture : undefined,
    };
  } catch {
    // The message is generic on purpose: it never echoes token contents.
    throw new UnauthorizedException('Token de Google invalido o expirado');
  }
}
