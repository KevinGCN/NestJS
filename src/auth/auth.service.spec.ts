/**
 * Unit tests for the Google sign-in rule of `AuthService`:
 *
 * - A valid, verified Firebase ID token logs the account in (or registers it
 *   the first time) and returns the same session shape as `POST /auth/login`.
 * - A token whose email is not verified is rejected.
 * - A disabled account is rejected.
 * - Unknown emails get a new `cliente` account created.
 */

import { UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { UsuariosService } from '../usuarios/usuarios.service';
import { verificarIdTokenFirebase } from './firebase-id-token';

// `@nestjs/jwt` is ESM-only and this Jest version cannot load ESM packages;
// the real JwtService is never used here anyway (we provide our own mock).
jest.mock('@nestjs/jwt', () => ({ JwtService: class JwtServiceMock {} }));

jest.mock('./firebase-id-token');

// What the mocked Firebase verifier returns for a valid Google identity.
const CLAIMS_GOOGLE = {
  sub: 'firebase-uid-1',
  email: 'google.user@example.com',
  email_verified: true,
  name: 'Ana Perez Lopez',
  picture: 'https://lh3.googleusercontent.com/a/foto.jpg',
};

const CREDENCIALES_EXISTENTES = {
  id: 7,
  password_hash: 'scrypt:hash-previa',
  activo: true,
};

const SESION = { access_token: 'jwt-de-prueba', token_type: 'Bearer', expires_in: 900 };

async function construirServicio() {
  const moduleRef = await Test.createTestingModule({
    providers: [
      AuthService,
      {
        provide: UsuariosService,
        useValue: {
          findCredentialsByEmail: jest.fn(),
          crear: jest.fn(),
        },
      },
      {
        provide: JwtService,
        useValue: {
          signAsync: jest.fn().mockResolvedValue('jwt-de-prueba'),
          decode: jest.fn().mockReturnValue({ iat: 1_000, exp: 1_900 }),
        },
      },
    ],
  }).compile();

  return {
    servicio: moduleRef.get(AuthService),
    usuarios: moduleRef.get(UsuariosService) as jest.Mocked<UsuariosService>,
    jwt: moduleRef.get(JwtService) as unknown as { signAsync: jest.Mock },
  };
}

const verificar = verificarIdTokenFirebase as jest.Mock;

beforeEach(() => {
  verificar.mockReset();
});

describe('AuthService.loginGoogle', () => {
  it('logs in an existing user with a verified token and returns the login shape', async () => {
    const { servicio, usuarios, jwt } = await construirServicio();

    verificar.mockResolvedValue(CLAIMS_GOOGLE);
    usuarios.findCredentialsByEmail.mockResolvedValue(CREDENCIALES_EXISTENTES);

    await expect(servicio.loginGoogle('id-token-valid')).resolves.toEqual(SESION);

    expect(usuarios.crear).not.toHaveBeenCalled();
    expect(jwt.signAsync).toHaveBeenCalledWith({ sub: 7 });
  });

  it('registers a new cliente account when the email is unknown', async () => {
    const { servicio, usuarios, jwt } = await construirServicio();

    verificar.mockResolvedValue(CLAIMS_GOOGLE);
    usuarios.findCredentialsByEmail.mockResolvedValue(null);
    (usuarios.crear as jest.Mock).mockResolvedValue({ id: 9 });

    await expect(servicio.loginGoogle('id-token-valid')).resolves.toEqual(SESION);

    expect(usuarios.crear).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'google.user@example.com',
        nombre: 'Ana',
        apellido: expect.any(String),
        foto_perfil_url: CLAIMS_GOOGLE.picture,
      }),
    );
    expect(jwt.signAsync).toHaveBeenCalledWith({ sub: 9 });
  });

  it('rejects a token with an unverified email', async () => {
    const { servicio, jwt } = await construirServicio();

    verificar.mockResolvedValue({ ...CLAIMS_GOOGLE, email_verified: false });

    await expect(servicio.loginGoogle('id-token-valid')).rejects.toThrow(UnauthorizedException);
    expect(jwt.signAsync).not.toHaveBeenCalled();
  });

  it('rejects a disabled account even with a valid token', async () => {
    const { servicio, usuarios, jwt } = await construirServicio();

    verificar.mockResolvedValue(CLAIMS_GOOGLE);
    usuarios.findCredentialsByEmail.mockResolvedValue({
      ...CREDENCIALES_EXISTENTES,
      activo: false,
    });

    await expect(servicio.loginGoogle('id-token-valid')).rejects.toThrow(UnauthorizedException);
    expect(jwt.signAsync).not.toHaveBeenCalled();
  });

  it('rejects a token whose email is empty', async () => {
    const { servicio } = await construirServicio();

    verificar.mockResolvedValue({ ...CLAIMS_GOOGLE, email: '' });

    await expect(servicio.loginGoogle('id-token-valid')).rejects.toThrow(UnauthorizedException);
  });
});
