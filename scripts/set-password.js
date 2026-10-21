/**
 * Script de bootstrap / administración de usuarios.
 *
 * Uso (desde la carpeta NestJS):
 *   npm run set-password -- emerson.prueba@gmail.com "MiClaveNueva123"
 *
 * Qué hace:
 *   - Cambia la contraseña de un usuario existente, buscado por correo.
 *   - Usa EXACTAMENTE el mismo algoritmo que el backend (scrypt), por lo que
 *     la contraseña nueva sirve para iniciar sesión en /api/auth/login.
 *   - NO requiere servidor levantado: va directo a la base de datos.
 *
 * Variables de entorno:
 *   DATABASE_URL (obligatoria, se lee de NestJS/.env)
 */
const path = require('path');
const { randomBytes, scrypt: scryptCallback } = require('node:crypto');
const { promisify } = require('node:util');
const { Pool } = require('pg');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const scrypt = promisify(scryptCallback);

/** Mismo formato que src/auth/password.ts → hashPassword() */
async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const key = await scrypt(password, salt, 64);
  return `scrypt$16384$8$1$${salt}$${key.toString('hex')}`;
}

function uso() {
  console.log('Uso: npm run set-password -- <correo> "<nueva contraseña>"');
  console.log('Ejemplo: npm run set-password -- emerson.prueba@gmail.com "MiClaveNueva123"');
}

/** Lee el esquema desde el parámetro ?schema= de la DATABASE_URL. */
function esquemaDe(url) {
  try {
    const param = new URL(url).searchParams.get('schema');
    return param && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(param) ? param : 'public';
  } catch {
    return 'public';
  }
}

(async () => {
  const [correo, password] = process.argv.slice(2);

  if (!correo || !password) {
    uso();
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('La contraseña debe tener al menos 8 caracteres.');
    process.exit(1);
  }

  if (!process.env.DATABASE_URL) {
    console.error('Falta DATABASE_URL en NestJS/.env');
    process.exit(1);
  }

  const esquema = esquemaDe(process.env.DATABASE_URL);
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const actual = await pool.query(
      `SELECT id, nombre, apellido, email FROM "${esquema}".usuarios WHERE lower(email) = lower($1)`,
      [correo],
    );

    if (actual.rowCount === 0) {
      console.error(`No existe ningún usuario con el correo "${correo}".`);
      process.exitCode = 1;
      return;
    }

    const usuario = actual.rows[0];
    const hash = await hashPassword(password);

    const actualizado = await pool.query(
      `UPDATE "${esquema}".usuarios
          SET password_hash = $1, fecha_actualizacion = now()
        WHERE id = $2
        RETURNING id, nombre, apellido, email, rol`,
      [hash, usuario.id],
    );

    console.log(`✔ Contraseña actualizada para ${actualizado.rows[0].email}`);
    console.table(actualizado.rows);
  } catch (error) {
    console.error('ERROR:', error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
