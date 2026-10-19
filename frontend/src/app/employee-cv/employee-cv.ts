import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { mensajeError } from '../core/errors';
import { Tatuador } from '../models/tatuador';
import { TatuadoresService } from '../services/tatuadores';

@Component({
  selector: 'app-employee-cv',
  imports: [],
  standalone: true,
  templateUrl: './employee-cv.html',
  styleUrl: './employee-cv.css',
})
export class EmployeeCV implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(TatuadoresService);

  protected readonly empleado = signal<Tatuador | null>(null);
  protected readonly error = signal('');

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.service.obtener(id).subscribe({
      next: (t) => this.empleado.set(t),
      error: (e) => this.error.set(mensajeError(e)),
    });
  }

  obtenerEstrellas(cantidad: number): string {
    return '★'.repeat(cantidad) + '☆'.repeat(5 - cantidad);
  }
}
