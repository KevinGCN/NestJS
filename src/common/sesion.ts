/**
 * Forma del usuario que `JwtStrategy.validate()` deja en `request.user`.
 *
 * Los guards solo saben si la petición trae un JWT válido, no de quién es la
 * fila que se está tocando. Por eso los servicios que necesitan autorización
 * por recurso (citas, horarios) reciben este objeto y deciden con `id`/`rol`.
 */
export type SesionUsuario = {
  id: number;
  rol: string;
};
