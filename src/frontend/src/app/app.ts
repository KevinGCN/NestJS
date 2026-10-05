import { Component, signal, OnInit } from '@angular/core'; // 1. Añadimos OnInit aquí
import { RouterOutlet } from '@angular/router';
import { UserNavbar } from "./navbar/user-navbar/user-navbar";
import { MainNavbar } from "./navbar/main-navbar/main-navbar";
// 2. Importamos tu servicio de Tawk (ajusta los puntos si la carpeta está en otro nivel)
import { TawkService } from './services/tawk'; 

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, UserNavbar, MainNavbar],
  templateUrl: './app.html',
  standalone: true,
  styleUrl: './app.css'
})
export class App implements OnInit { // 3. Le decimos que implemente OnInit
  protected readonly title = signal('Ink-Creature');

  // 4. Inyectamos el servicio en el constructor
  constructor(private tawkService: TawkService) {}

  // 5. Ejecutamos la carga del chat cuando inicie la app
  ngOnInit() {
    this.tawkService.loadChat();
  }
}
