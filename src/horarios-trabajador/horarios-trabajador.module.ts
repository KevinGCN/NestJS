import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { HorariosTrabajadorController } from './horarios-trabajador.controller';
import { HorariosTrabajadorService } from './horarios-trabajador.service';

@Module({
  imports: [PrismaModule],
  controllers: [HorariosTrabajadorController],
  providers: [HorariosTrabajadorService],
  exports: [HorariosTrabajadorService],
})
export class HorariosTrabajadorModule {}
