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

/**
 * Endpoints REST del catálogo de tatuadores (`/api/empleados`).
 * Importante: una fila aquí solo significa "está en el catálogo"; el permiso
 * real es `usuarios.rol = 'empleado'`. Para que alguien sea trabajador hacen
 * falta las dos cosas, por eso la UI hace POST /api/empleados y además
 * PATCH /api/usuarios/:id/rol.
 * Consultar es público (catálogo visible sin sesión); escribir exige JWT.
 */
@Controller('empleados')
export class EmpleadosController {
  constructor(private readonly empleadosService: EmpleadosService) {}

  // Crear/Modificar/Borrar empleados exige sesión (JWT); consultar es público.
  // Este POST NO cambia el rol del usuario: solo lo mete al catálogo.
  @UseGuards(JwtAuthGuard)
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

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateEmpleadoDto: UpdateEmpleadoDto,
  ) {
    return this.empleadosService.actualizar(id, updateEmpleadoDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.empleadosService.eliminar(id);
  }
}