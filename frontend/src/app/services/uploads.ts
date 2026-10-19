import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { API_URL } from '../core/api';

@Injectable({ providedIn: 'root' })
export class UploadsService {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_URL);

  /** Sube una imagen al backend y devuelve su URL pública (ej. '/files/123-abc.jpg'). */
  subir(file: File) {
    const body = new FormData();
    body.append('file', file);
    return this.http.post<{ url: string }>(`${this.base}/uploads`, body).pipe(map((r) => r.url));
  }
}
