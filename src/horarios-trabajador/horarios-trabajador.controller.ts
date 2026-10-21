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
import { HorariosTrabajadorService } from './horarios-trabajador.service';
import { CreateHorarioDto } from './dto/create-horario.dto';
import { UpdateHorarioDto } from './dto/update-horario.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('horarios-trabajador')
export class HorariosTrabajadorController {
  constructor(private readonly horariosService: HorariosTrabajadorService) {}

  // Crear/Modificar/Borrar exigen sesión (JWT); consultar es público.
  @UseGuards(JwtAuthGuard)
  @Post()
  crear(@Body() createHorarioDto: CreateHorarioDto) {
    return this.horariosService.crear(createHorarioDto);
  }

  @Get()
  obtenerTodos(@Query('empleado_id') empleadoId?: string) {
    return this.horariosService.obtenerTodos({
      empleado_id: empleadoId ? Number(empleadoId) : undefined,
    });
  }

  @Get(':id')
  obtenerUno(@Param('id', ParseIntPipe) id: number) {
    return this.horariosService.obtenerUno(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateHorarioDto: UpdateHorarioDto,
  ) {
    return this.horariosService.actualizar(id, updateHorarioDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.horariosService.eliminar(id);
  }
}
