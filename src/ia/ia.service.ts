import {
  Injectable,
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';

/**
 * Proxy hacia Google Gemini.
 *
 * IMPORTANTE: la clave de la API **nunca** sale del backend. Vive solo en
 * la variable de entorno `GEMINI_API_KEY` (en Railway) y el frontend llama
 * a `POST /api/ia/analyze-tattoo`. Si la clave estuviera en el frontend,
 * cualquiera podría leerla del bundle del navegador.
 */
@Injectable()
export class IaService {
  private readonly modelo = 'gemini-2.5-flash';
  private cliente?: GoogleGenAI;

  /**
   * Analiza una descripción de tatuaje y devuelve el texto crudo de la IA
   * (se espera un JSON con complejidad, tiempo, precioMin, precioMax y
   * justificación).
   */
  async analizarTatuaje(descripcion: string): Promise<string> {
    const prompt = `
Actúa como un tatuador profesional colombiano del estudio Ink Creature.

Analiza la siguiente solicitud:

"${descripcion}"

Debes responder EXCLUSIVAMENTE con un JSON válido.

No uses markdown.
No uses comillas triples.
No agregues explicaciones fuera del JSON.

Formato:

{
  "complejidad": "Baja | Media | Alta",
  "tiempo": "texto",
  "precioMin": numero,
  "precioMax": numero,
  "justificacion": "texto"
}

Precios realistas para Colombia:
Pequeño:
  100000 - 300000 COP
Mediano:
  300000 - 700000 COP
Grande:
  700000 - 2000000 COP
`;

    // El cliente se resuelve FUERA del try: si falta la configuración del
    // servidor, el error debe salir como 503 y no como un fallo de Google.
    const cliente = this.clienteIA();

    try {
      const respuesta = await cliente.models.generateContent({
        model: this.modelo,
        contents: prompt,
      });

      return respuesta.text ?? '{}';
    } catch (error) {
      // No se filtra el detalle del error de Google: puede incluir la URL
      // de la API con la clave en los query params.
      throw new InternalServerErrorException(
        'No se pudo completar el análisis con la IA. Intenta de nuevo en unos minutos.',
      );
    }
  }

  /**
   * Cliente de Gemini con la clave del entorno. Se crea en la primera
   * llamada (no al arrancar) para que la app pueda levantar sin la variable
   * puesta y devuelva un error claro solo a quien use esta función.
   */
  private clienteIA(): GoogleGenAI {
    if (this.cliente) {
      return this.cliente;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new ServiceUnavailableException(
        'El servicio de IA no está disponible: falta la variable GEMINI_API_KEY en el servidor.',
      );
    }

    this.cliente = new GoogleGenAI({ apiKey });
    return this.cliente;
  }
}
