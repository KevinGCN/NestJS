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
  Req,
  UseGuards,
} from '@nestjs/common';
import { HorariosTrabajadorService } from './horarios-trabajador.service';
import { CreateHorarioDto } from './dto/create-horario.dto';
import { UpdateHorarioDto } from './dto/update-horario.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SesionUsuario } from '../common/sesion';

/**
 * Endpoints REST de horarios (`/api/horarios-trabajador`).
 * Es la plantilla semanal del tatuador (día 0-6 + franja horaria), no citas
 * concretas: el frontend la usa para pintar la disponibilidad.
 * Consultar es público; crear/modificar/borrar exige JWT **y** ser el tatuador
 * dueño de la ficha (o admin): la comprobación vive en el servicio.
 */
@Controller('horarios-trabajador')
export class HorariosTrabajadorController {
  constructor(private readonly horariosService: HorariosTrabajadorService) {}

  // Crear/Modificar/Borrar exigen sesión (JWT); consultar es público.
  @UseGuards(JwtAuthGuard)
  @Post()
  crear(
    @Body() createHorarioDto: CreateHorarioDto,
    @Req() req: { user?: SesionUsuario },
  ) {
    return this.horariosService.crear(createHorarioDto, req.user);
  }

  // El filtro llega como texto y es opcional, por eso se convierte a mano
  // (ParseIntPipe respondería 400 cuando no se envía ?empleado_id=).
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
    @Req() req: { user?: SesionUsuario },
  ) {
    return this.horariosService.actualizar(id, updateHorarioDto, req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  eliminar(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: { user?: SesionUsuario },
  ) {
    return this.horariosService.eliminar(id, req.user);
  }
}
