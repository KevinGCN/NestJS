/**
 * Módulo raíz del API: solo registra los módulos de funcionalidad y los dos
 * componentes base (controlador y servicio de `AppModule`).
 *
 * El orden de `imports` no define dependencias (Nest resuelve el grafo por su
 * cuenta); `PrismaModule` va primero por legibilidad, ya que es @Global y lo
 * consume casi todo el resto.
 */

import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
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
    // @Global(): expone PrismaService sin que cada módulo lo importe.
    PrismaModule,
    UsuariosModule,
    EmpleadosModule,
    GaleriaModule,
    CitasModule,
    HorariosTrabajadorModule,
    // Login/JWT y las estrategias de Passport.
    AuthModule,
    // Binarios de imágenes almacenados en la BD (proyecto7.imagenes).
    ImagenesModule,
    // Proxy a Google Gemini; la API key vive solo en el backend.
    IaModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
