import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { GaleriaService } from './galeria.service';
import { CreateGaleriaDto } from './dto/create-galeria.dto';
import { UpdateGaleriaDto } from './dto/update-galeria.dto';

@Controller('galeria')
export class GaleriaController {
  constructor(private readonly galeriaService: GaleriaService) {}

  @Post()
  crear(@Body() createGaleriaDto: CreateGaleriaDto) {
    return this.galeriaService.crear(createGaleriaDto);
  }

  @Get()
  obtenerTodos() {
    return this.galeriaService.obtenerTodos();
  }

  @Get(':id')
  obtenerUno(@Param('id', ParseIntPipe) id: number) {
    return this.galeriaService.obtenerUno(id);
  }

  @Patch(':id')
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateGaleriaDto: UpdateGaleriaDto,
  ) {
    return this.galeriaService.actualizar(id, updateGaleriaDto);
  }

  @Delete(':id')
  eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.galeriaService.eliminar(id);
  }
}