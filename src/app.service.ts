/**
 * Servicio raíz: el `Hello World!` que queda del esqueleto de Nest.
 * Solo lo usa `AppController.getHello()`; la lógica real vive en los módulos
 * de funcionalidad (usuarios, citas, galería, …).
 */

import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  /** Respuesta fija usada como smoke test de que el inyector de Nest funciona. */
  getHello(): string {
    return 'Hello World!';
  }
}
