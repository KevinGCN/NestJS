import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { forkJoin, map, switchMap } from 'rxjs';
import { API_URL } from '../core/api';
import { aTatuador, DatosTatuador, EmpleadoApi, Tatuador } from '../models/tatuador';

@Injectable({ providedIn: 'root' })
export class TatuadoresService {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_URL);

  listar() {
    return this.http
      .get<EmpleadoApi[]>(`${this.base}/empleados`)
      .pipe(map((l) => l.map(aTatuador).filter((t) => t.activo)));
  }

  obtener(id: number) {
    return this.http.get<EmpleadoApi>(`${this.base}/empleados/${id}`).pipe(map(aTatuador));
  }

  /** En el backend un tatuador es un usuario + un empleado: se crean en secuencia. */
  crear(d: DatosTatuador) {
    return this.http
      .post<{ id: number }>(`${this.base}/usuarios`, {
        nombre: d.nombre.trim(),
        apellido: d.apellido.trim(),
        email: d.email.trim(),
        // Requerido por la API; el tatuador no inicia sesión con esta clave (el login es Firebase).
        password: crypto.randomUUID(),
        foto_perfil_url: d.foto || undefined,
      })
      .pipe(
        switchMap((u) =>
          this.http.post<EmpleadoApi>(`${this.base}/empleados`, {
            usuario_id: u.id,
            especialidad: d.especialidad.trim(),
            biografia: d.descripcion.trim(),
          }),
        ),
        map(aTatuador),
      );
  }

  actualizar(t: Tatuador, d: DatosTatuador) {
    return forkJoin([
      this.http.patch(`${this.base}/usuarios/${t.usuarioId}`, {
        nombre: d.nombre.trim(),
        apellido: d.apellido.trim(),
        foto_perfil_url: d.foto,
      }),
      this.http.patch(`${this.base}/empleados/${t.id}`, {
        especialidad: d.especialidad.trim(),
        biografia: d.descripcion.trim(),
      }),
    ]);
  }

  /** "Eliminar" desactiva al tatuador: borrarlo fallaría si tiene imágenes en la galería. */
  desactivar(id: number) {
    return this.http.patch(`${this.base}/empleados/${id}`, { activo: false });
  }
}
