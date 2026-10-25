/**
 * DTO del análisis de IA.
 *
 * Las validaciones las aplica el `ValidationPipe` global de `main.ts`: una
 * descripción demasiado corta o demasiado larga se rechaza con 400 antes de
 * llegar al servicio y, por tanto, antes de gastar una llamada a Gemini.
 */
import { IsString, MaxLength, MinLength } from 'class-validator';

export class AnalizarTatuajeDto {
  /**
   * Descripción libre del tatuaje que escribe el cliente.
   *
   * Se limita la longitud para no enviar prompts gigantes a la IA
   * (y para que nadie use el endpoint como un proxy de texto arbitrario).
   */
  @IsString({ message: 'La descripción debe ser texto' })
  @MinLength(10, {
    message: 'Describe el tatuaje con al menos 10 caracteres',
  })
  @MaxLength(2000, {
    message: 'La descripción no puede superar los 2000 caracteres',
  })
  descripcion: string;
}
