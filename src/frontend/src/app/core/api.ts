import { InjectionToken } from '@angular/core';

/** Base de la API NestJS. En desarrollo '/api' lo redirige proxy.conf.json al puerto 3000. */
export const API_URL = new InjectionToken<string>('API_URL', {
  providedIn: 'root',
  factory: () => '/api',
});
