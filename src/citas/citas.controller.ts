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
import { CitasService } from './citas.service';
import { CreateCitaDto } from './dto/create-cita.dto';
import { UpdateCitaDto } from './dto/update-cita.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SesionUsuario } from '../common/sesion';

/**
 * Endpoints REST de citas (`/api/citas`).
 * Leer es público a propósito (el sitio muestra la agenda sin exigir sesión),
 * y eso implica que NO hay autorización por usuario al consultar: los filtros
 * `?usuario_id=` / `?empleado_id=` son comodidad, no control de acceso.
 * Crear, modificar y borrar sí exigen JWT **y** que la cita sea tuya: la
 * comprobación de propiedad vive en `CitasService` (el guard solo ve el JWT).
 */
@Controller('citas')
export class CitasController {
  constructor(private readonly citasService: CitasService) {}

  // Crear/Modificar/Borrar exigen sesión (JWT); consultar es público.
  @UseGuards(JwtAuthGuard)
  @Post()
  crear(
    @Body() createCitaDto: CreateCitaDto,
    @Req() req: { user?: SesionUsuario },
  ) {
    return this.citasService.crear(createCitaDto, req.user);
  }

  // Los query params llegan como texto y son opcionales, así que se convierten
  // a mano: `ParseIntPipe` fallaría con 400 cuando no se envía el filtro.
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

  // Cambiar el `estado` (confirmar, cancelar, completar) pasa por aquí; el DTO
  // valida que el valor exista en ESTADOS_CITA antes de tocar la BD.
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCitaDto: UpdateCitaDto,
    @Req() req: { user?: SesionUsuario },
  ) {
    return this.citasService.actualizar(id, updateCitaDto, req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  eliminar(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: { user?: SesionUsuario },
  ) {
    return this.citasService.eliminar(id, req.user);
  }
}
