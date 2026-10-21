import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { ProjectsModule } from './projects/projects.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { EmpleadosModule } from './empleados/empleados.module';
import { GaleriaModule } from './galeria/galeria.module';
import { CitasModule } from './citas/citas.module';
import { HorariosTrabajadorModule } from './horarios-trabajador/horarios-trabajador.module';
import { AuthModule } from './auth/auth.module';
import { ImagenesModule } from './imagenes/imagenes.module';
import { IaModule } from './ia/ia.module';

@Module({
  imports: [
    PrismaModule,
    ProjectsModule,
    UsuariosModule,
    EmpleadosModule,
    GaleriaModule,
    CitasModule,
    HorariosTrabajadorModule,
    AuthModule,
    ImagenesModule,
    IaModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}