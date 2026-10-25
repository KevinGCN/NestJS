import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { EmpleadosService } from './empleados.service';
import { CreateEmpleadoDto } from './dto/create-empleado.dto';
import { UpdateEmpleadoDto } from './dto/update-empleado.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

/**
 * Endpoints REST del catálogo de tatuadores (`/api/empleados`).
 * Importante: una fila aquí solo significa "está en el catálogo"; el permiso
 * real es `usuarios.rol = 'empleado'`. Para que alguien sea trabajador hacen
 * falta las dos cosas, por eso la UI hace POST /api/empleados y además
 * PATCH /api/usuarios/:id/rol.
 * Consultar es público (catálogo visible sin sesión); escribir es solo de admin.
 */
@Controller('empleados')
export class EmpleadosController {
  constructor(private readonly empleadosService: EmpleadosService) {}

  // Crear/Modificar/Borrar empleados es exclusivo de admin: la ficha del
  // tatuador forma parte del catálogo público y no debe poder autoconcedérsela
  // cualquiera. Ojo: este POST NO cambia el rol del usuario, solo lo mete al
  // catálogo (el rol se cambia con PATCH /api/usuarios/:id/rol).
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post()
  crear(@Body() createEmpleadoDto: CreateEmpleadoDto) {
    return this.empleadosService.crear(createEmpleadoDto);
  }

  @Get()
  obtenerTodos() {
    return this.empleadosService.obtenerTodos();
  }

  @Get(':id')
  obtenerUno(@Param('id', ParseIntPipe) id: number) {
    return this.empleadosService.obtenerUno(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Patch(':id')
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateEmpleadoDto: UpdateEmpleadoDto,
  ) {
    return this.empleadosService.actualizar(id, updateEmpleadoDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Delete(':id')
  eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.empleadosService.eliminar(id);
  }
}
