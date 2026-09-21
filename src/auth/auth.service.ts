import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsuariosService } from '../usuarios/usuarios.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(private readonly usuariosService: UsuariosService) {}

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const credenciales = await this.usuariosService.findCredentialsByEmail(email);

    if (!credenciales) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const usuarioPublico = await this.usuariosService.obtenerUno(credenciales.id);

    return {
      mensaje: 'Login preparado correctamente (verificación de contraseña pendiente)',
      usuario: usuarioPublico,
    };
  }
}