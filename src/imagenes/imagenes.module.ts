import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ImagenesController } from './imagenes.controller';
import { ImagenesService } from './imagenes.service';

@Module({
  imports: [PrismaModule],
  controllers: [ImagenesController],
  providers: [ImagenesService],
  exports: [ImagenesService],
})
export class ImagenesModule {}
