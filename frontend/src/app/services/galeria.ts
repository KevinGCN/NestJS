import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { API_URL } from '../core/api';
import { aImagen, GaleriaApi } from '../models/galeria';

@Injectable({ providedIn: 'root' })
export class GaleriaService {
  private readonly http = inject(HttpClient);
  private readonly url = `${inject(API_URL)}/galeria`;

  listar() {
    return this.http.get<GaleriaApi[]>(this.url).pipe(map((l) => l.map(aImagen)));
  }

  crear(d: { src: string; alt: string; empleadoId: number; subidoPor: number }) {
    return this.http
      .post<GaleriaApi>(this.url, {
        subido_por: d.subidoPor,
        empleado_id: d.empleadoId,
        imagen_url: d.src,
        titulo: d.alt,
      })
      .pipe(map(aImagen));
  }

  eliminar(id: number) {
    return this.http.delete(`${this.url}/${id}`);
  }
}
