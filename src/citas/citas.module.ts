import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CitasController } from './citas.controller';
import { CitasService } from './citas.service';

@Module({
  imports: [PrismaModule],
  controllers: [CitasController],
  providers: [CitasService],
  exports: [CitasService],
})
export class CitasModule {}
