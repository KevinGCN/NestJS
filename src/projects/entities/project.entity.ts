/**
 * Forma de un `Project` (ejemplo). No es una entidad de Prisma: es solo el tipo
 * que describe la respuesta esperada; por eso no hay decoradores.
 * Ojo: el nombre de la clase está como quedó en el scaffold (`Projec`).
 */

export class Projec {
  id!: string;
  name!: string;
  description!: string;
  categoryEditionId!: string;
  createdAt!: Date;
  updatedAt!: Date;
}