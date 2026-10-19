import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsuariosService } from '../usuarios/usuarios.service';
import { LoginDto } from './dto/login.dto';
import { verifyPassword, DUMMY_HASH } from './password';

@Injectable()
export class AuthService {
  constructor(
    private readonly usuariosService: UsuariosService,
    private readonly jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const credenciales = await this.usuariosService.findCredentialsByEmail(email);

    // Si no existe, igual "gastamos" el mismo tiempo comparando contra DUMMY_HASH
    const passwordValida = await verifyPassword(
      password,
      credenciales ? credenciales.password_hash : DUMMY_HASH,
    );

    if (!credenciales || !passwordValida) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const access_token = await this.jwtService.signAsync({ sub: credenciales.id });

    // decode() NO verifica el token: solo lo "lee".
    // Es seguro aquí porque lo acabamos de firmar nosotros mismos.
    const payload = this.jwtService.decode(access_token) as { iat: number; exp: number };

    return {
      access_token,
      token_type: 'Bearer' as const,
      expires_in: payload.exp - payload.iat,
    };
  }
}