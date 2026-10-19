import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { switchMap } from 'rxjs';
import { mensajeError } from '../core/errors';
import { ImagenGaleria } from '../models/galeria';
import { Tatuador } from '../models/tatuador';
import { AuthService } from '../services/auth';
import { GaleriaService } from '../services/galeria';
import { TatuadoresService } from '../services/tatuadores';
import { UploadsService } from '../services/uploads';

@Component({
  selector: 'app-gallery',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './gallery.html',
  styleUrls: ['./gallery.css'],
})
export class Gallery implements OnInit {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly galeriaService = inject(GaleriaService);
  private readonly tatuadoresService = inject(TatuadoresService);
  private readonly uploads = inject(UploadsService);

  // Estado asíncrono en signals (la app es zoneless).
  protected readonly imagenes = signal<ImagenGaleria[]>([]);
  protected readonly tatuadores = signal<Tatuador[]>([]);
  protected readonly selectedImage = signal<string | null>(null);
  protected readonly error = signal('');
  protected readonly mostrarModalSubida = signal(false);
  protected readonly previewTemporal = signal('');
  protected readonly subiendo = signal(false);
  protected readonly tatuadorSeleccionado = signal<number | null>(null);
  protected readonly nombreImagenTemp = signal('');

  protected esAdmin = false;
  private archivoTemporal: File | null = null;

  ngOnInit() {
    const usuario = this.auth.obtenerUsuario();
    this.esAdmin = usuario?.charge === 'CEO' || usuario?.charge === 'Admin';

    this.galeriaService.listar().subscribe({
      next: (l) => this.imagenes.set(l),
      error: (e) => this.error.set(mensajeError(e)),
    });
    this.tatuadoresService.listar().subscribe({
      next: (l) => {
        this.tatuadores.set(l);
        this.tatuadorSeleccionado.set(l[0]?.id ?? null);
      },
      error: (e) => this.error.set(mensajeError(e)),
    });
  }

  openImage(img: string) {
    this.selectedImage.set(img);
  }

  closeImage() {
    this.selectedImage.set(null);
  }

  verTatuador(empleadoId: number | null, event: Event) {
    event.stopPropagation();
    if (empleadoId !== null) this.router.navigate(['/employeeCV', empleadoId]);
  }

  handleImageError(event: Event) {
    const img = event.target as HTMLImageElement;
    img.onerror = null; // evita bucle si el placeholder tampoco existe
    img.src = 'image/placeholder.jpg';
  }

  // ── Paso 1: archivo seleccionado → abrir modal
  seleccionarArchivo(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.archivoTemporal = file;
    this.nombreImagenTemp.set(file.name.replace(/\.[^.]+$/, ''));

    const reader = new FileReader();
    reader.onload = () => {
      this.previewTemporal.set(reader.result as string);
      this.mostrarModalSubida.set(true);
    };
    reader.readAsDataURL(file);

    input.value = ''; // permite volver a elegir el mismo archivo
  }

  // ── Paso 2: subir el archivo al backend y registrar la imagen en la DB
  confirmarSubida() {
    const file = this.archivoTemporal;
    const tatuador = this.tatuadores().find((t) => t.id === this.tatuadorSeleccionado());
    if (!file || !tatuador) {
      this.error.set('Selecciona un tatuador para vincular la imagen.');
      return;
    }

    this.subiendo.set(true);
    this.uploads
      .subir(file)
      .pipe(
        switchMap((src) =>
          this.galeriaService.crear({
            src,
            alt: this.nombreImagenTemp().trim() || 'Nueva imagen',
            empleadoId: tatuador.id,
            subidoPor: tatuador.usuarioId, // el backend aún no conoce al usuario de Firebase
          }),
        ),
      )
      .subscribe({
        next: (nueva) => {
          this.imagenes.update((l) => [nueva, ...l]);
          this.subiendo.set(false);
          this.cerrarModalSubida();
        },
        error: (e) => {
          this.error.set(mensajeError(e));
          this.subiendo.set(false);
        },
      });
  }

  cerrarModalSubida() {
    this.mostrarModalSubida.set(false);
    this.archivoTemporal = null;
    this.previewTemporal.set('');
    this.nombreImagenTemp.set('');
  }

  eliminarImagen(img: ImagenGaleria, event: Event) {
    event.stopPropagation();
    this.galeriaService.eliminar(img.id).subscribe({
      next: () => this.imagenes.update((l) => l.filter((i) => i.id !== img.id)),
      error: (e) => this.error.set(mensajeError(e)),
    });
  }
}
