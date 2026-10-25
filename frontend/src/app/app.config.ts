/**
 * Configuración de la aplicación Angular
 * 
 * Punto de entrada de providers y configuración global.
 * Inicializa Firebase y provee los servicios esenciales
 * para toda la aplicación.
 * 
 * Providers:
 * 1. provideBrowserGlobalErrorListeners() - Captura errores globales
 * 2. provideRouter() - Sistema de enrutamiento
 * 3. provideFirebaseApp() - Inicialización Firebase
 * 4. provideAuth() - Servicio de autenticación Firebase
 * 
 * Integración Firebase:
 * - provideFirebaseApp inicializa la app con firebaseConfig
 * - provideAuth expone getAuth() para inyección en servicios
 * - Ambos usan factories () => para lazy-initialization
 */
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { routes } from './app.routes';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { firebaseConfig } from './config/firebase.config';

export const appConfig: ApplicationConfig = {
  providers: [
    // Manejo de errores globales no capturados
    provideBrowserGlobalErrorListeners(),

    // Proveedor del sistema de enrutamiento
    provideRouter(routes),

    // HttpClient global (usa fetch) para hablar con el backend NestJS
    provideHttpClient(withFetch()),

    // Inicialización Firebase (1 sola vez por app)
    provideFirebaseApp(() => initializeApp(firebaseConfig)),

    // Proveedor del servicio Auth de Firebase
    provideAuth(() => getAuth())
  ]
};
