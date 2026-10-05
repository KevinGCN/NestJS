import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { mensajeError } from '../core/errors';
import { DatosTatuador, Tatuador } from '../models/tatuador';
import { AuthService } from '../services/auth';
import { TatuadoresService } from '../services/tatuadores';
import { UploadsService } from '../services/uploads';

const formVacio = (): DatosTatuador => ({
  nombre: '',
  apellido: '',
  email: '',
  especialidad: '',
  descripcion: '',
  foto: '',
});

@Component({
  selector: 'app-employees',
  imports: [FormsModule, RouterLink],
  standalone: true,
  templateUrl: './employees.html',
  styleUrl: './employees.css',
})
export class Employees implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly service = inject(TatuadoresService);
  private readonly uploads = inject(UploadsService);

  // Estado asíncrono en signals (la app es zoneless: sin signals la vista no se actualiza).
  protected readonly tatuadores = signal<Tatuador[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal('');
  protected readonly mostrarModal = signal(false);
  protected readonly fotoPreview = signal('');
  protected readonly errorForm = signal('');
  protected readonly guardando = signal(false);

  protected esAdmin = false;
  protected modoEdicion = false;
  protected editando: Tatuador | null = null;
  protected form: DatosTatuador = formVacio();

  ngOnInit() {
    const usuario = this.auth.obtenerUsuario();
    this.esAdmin = usuario?.charge === 'CEO' || usuario?.charge === 'Admin';
    this.cargarTatuadores();
  }

  cargarTatuadores() {
    this.service.listar().subscribe({
      next: (lista) => {
        this.tatuadores.set(lista);
        this.cargando.set(false);
      },
      error: (e) => {
        this.error.set(mensajeError(e));
        this.cargando.set(false);
      },
    });
  }

  obtenerEstrellas(cantidad: number): string {
    return '★'.repeat(cantidad) + '☆'.repeat(5 - cantidad);
  }

  abrirAgregar() {
    this.modoEdicion = false;
    this.editando = null;
    this.form = formVacio();
    this.fotoPreview.set('');
    this.errorForm.set('');
    this.mostrarModal.set(true);
  }

  abrirEditar(t: Tatuador) {
    this.modoEdicion = true;
    this.editando = t;
    this.form = {
      nombre: t.nombrePila,
      apellido: t.apellido,
      email: '',
      especialidad: t.especialidad,
      descripcion: t.descripcion,
      foto: t.foto,
    };
    this.fotoPreview.set(t.foto);
    this.errorForm.set('');
    this.mostrarModal.set(true);
  }

  cerrarModal() {
    this.mostrarModal.set(false);
  }

  /** Sube la foto al backend apenas se elige y guarda la URL resultante. */
  cargarFoto(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.uploads.subir(file).subscribe({
      next: (url) => {
        this.form.foto = url;
        this.fotoPreview.set(url);
      },
      error: (e) => this.errorForm.set(mensajeError(e)),
    });
  }

  guardar() {
    const f = this.form;
    if (!f.nombre.trim() || !f.apellido.trim()) {
      this.errorForm.set('El nombre y el apellido son obligatorios.');
      return;
    }
    if (!this.modoEdicion && !f.email.trim()) {
      this.errorForm.set('El correo es obligatorio.');
      return;
    }
    if (!f.especialidad.trim()) {
      this.errorForm.set('La especialidad es obligatoria.');
      return;
    }
    if (!f.foto) {
      this.errorForm.set('Debes subir una foto.');
      return;
    }

    this.errorForm.set('');
    this.guardando.set(true);
    const peticion = this.editando
      ? this.service.actualizar(this.editando, f)
      : this.service.crear(f);

    peticion.subscribe({
      next: () => {
        this.guardando.set(false);
        this.cerrarModal();
        this.cargarTatuadores();
      },
      error: (e) => {
        this.errorForm.set(mensajeError(e));
        this.guardando.set(false);
      },
    });
  }

  eliminar(t: Tatuador) {
    if (!confirm('¿Estás seguro de que quieres eliminar este tatuador?')) return;
    this.service.desactivar(t.id).subscribe({
      next: () => this.tatuadores.update((l) => l.filter((x) => x.id !== t.id)),
      error: (e) => this.error.set(mensajeError(e)),
    });
  }
}
