import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { GaleriaController } from './galeria.controller';
import { GaleriaService } from './galeria.service';

@Module({
  imports: [PrismaModule],
  controllers: [GaleriaController],
  providers: [GaleriaService],
})
export class GaleriaModule {}