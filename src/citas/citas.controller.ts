import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CitasService } from './citas.service';
import { CreateCitaDto } from './dto/create-cita.dto';
import { UpdateCitaDto } from './dto/update-cita.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('citas')
export class CitasController {
  constructor(private readonly citasService: CitasService) {}

  // Crear/Modificar/Borrar exigen sesión (JWT); consultar es público.
  @UseGuards(JwtAuthGuard)
  @Post()
  crear(@Body() createCitaDto: CreateCitaDto) {
    return this.citasService.crear(createCitaDto);
  }

  @Get()
  obtenerTodos(
    @Query('usuario_id') usuarioId?: string,
    @Query('empleado_id') empleadoId?: string,
  ) {
    return this.citasService.obtenerTodos({
      usuario_id: usuarioId ? Number(usuarioId) : undefined,
      empleado_id: empleadoId ? Number(empleadoId) : undefined,
    });
  }

  @Get(':id')
  obtenerUno(@Param('id', ParseIntPipe) id: number) {
    return this.citasService.obtenerUno(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCitaDto: UpdateCitaDto,
  ) {
    return this.citasService.actualizar(id, updateCitaDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.citasService.eliminar(id);
  }
}
