import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { IaService } from './ia.service';
import { AnalizarTatuajeDto } from './dto/analizar-tatuaje.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

/**
 * Proxy de inteligencia artificial.
 *
 *  POST /api/ia/analyze-tattoo → analiza una descripción de tatuaje (JWT)
 *
 * El frontend NO habla directamente con Google: la llave de Gemini se
 * queda en el servidor (`GEMINI_API_KEY`), así que nunca viaja al
 * navegador ni queda compilada en el bundle.
 */
@Controller('ia')
export class IaController {
  constructor(private readonly iaService: IaService) {}

  /**
   * Analiza la descripción y devuelve la respuesta de la IA.
   *
   * Se exige JWT (`JwtAuthGuard`) para que el endpoint no sea un proxy
   * abierto a la API de Google: cada llamada cuesta dinero.
   * El texto se envuelve en un objeto (`{ respuesta }`) en lugar de devolver
   * la cadena cruda, para que el frontend siempre reciba JSON parseable.
   */
  @UseGuards(JwtAuthGuard)
  @Post('analyze-tattoo')
  async analizarTatuaje(@Body() dto: AnalizarTatuajeDto) {
    const respuesta = await this.iaService.analizarTatuaje(dto.descripcion);
    return { respuesta };
  }
}
