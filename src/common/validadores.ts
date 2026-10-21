import {
  ValidationArguments,
  ValidationOptions,
  buildMessage,
  registerDecorator,
} from 'class-validator';

/**
 * URLs de imagen admitidas:
 *  - absoluta:  https://ejemplo.com/foto.jpg
 *  - del backend: /api/imagenes/<id>   (imagen guardada en la base de datos)
 *  - legacy:     /uploads/<archivo>   (archivos antiguos en disco)
 */
const PATRON_IMAGEN =
  /^(https?:\/\/[^\s]+|\/api\/imagenes\/\d+|\/uploads\/[A-Za-z0-9._-]+)$/;

/**
 * Decorador de validación para `imagen_url` (y `foto_perfil_url`).
 * Sustituye a `@IsUrl()`, que rechazaba las rutas relativas que devuelve
 * el backend al guardar la imagen en la base de datos.
 */
export function IsImagenUrl(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string): void {
    registerDecorator({
      name: 'isImagenUrl',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          if (typeof value !== 'string') return false;
          return PATRON_IMAGEN.test(value.trim());
        },
        defaultMessage(args: ValidationArguments): string {
          return buildMessage(
            (eachPrefix) =>
              `${eachPrefix}$property debe ser una URL válida o una ruta del backend (/api/imagenes/<id>)`,
            validationOptions,
          )(args);
        },
      },
    });
  };
}
