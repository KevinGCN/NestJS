
import { Module } from '@nestjs/common';
import { UsuariosController } from './usuarios.controller';
import { UsuariosService } from './usuarios.service';
import { RolesGuard } from '../auth/roles.guard';

@Module({
  controllers: [UsuariosController],
  providers: [UsuariosService, RolesGuard],
  exports: [UsuariosService],
})
export class UsuariosModule {}
