function requerido(nombre: string): string {
  const valor = process.env[nombre];
  if (!valor) {
    throw new Error(`Falta la variable de entorno ${nombre}`);
  }
  return valor;
}

export const jwtConfig = {
  secret: requerido('JWT_SECRET'),
  expiresIn: process.env.JWT_EXPIRES_IN ?? '3600s',
};