import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { ProjectsModule } from './projects/projects.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { EmpleadosModule } from './empleados/empleados.module';
import { GaleriaModule } from './galeria/galeria.module';

@Module({
  imports: [
    PrismaModule,
    ProjectsModule,
    UsuariosModule,
    EmpleadosModule,
    GaleriaModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}