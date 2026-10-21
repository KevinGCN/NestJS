/**
 * Script de bootstrap / administración de roles.
 *
 * Uso (desde la carpeta NestJS):
 *   npm run set-rol -- emerson.prueba@gmail.com admin
 *   npm run set-rol -- kevin.cobo@gmail.com empleado
 *
 * Qué hace:
 *   - Cambia el rol de un usuario existente, buscado por correo.
 *   - NO requiere servidor levantado ni token: va directo a la base de datos.
 *   - Se usa para el arranque (crear el primer admin) o para reparaciones
 *     puntuales, ya que el endpoint HTTP PATCH /api/usuarios/:id/rol
 *     exige que quien lo llame ya sea admin.
 *
 * Variables de entorno:
 *   DATABASE_URL (obligatoria, se lee de NestJS/.env)
 */
const path = require('path');
const { Pool } = require('pg');

// Carga NestJS/.env aunque el script se ejecute desde otro directorio.
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const ROLES_VALIDOS = ['cliente', 'empleado', 'admin'];

function uso() {
  console.log('Uso: npm run set-rol -- <correo> <rol>');
  console.log(`Roles válidos: ${ROLES_VALIDOS.join(', ')}`);
  console.log('Ejemplo: npm run set-rol -- emerson.prueba@gmail.com admin');
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
  const [correo, rol] = process.argv.slice(2);

  if (!correo || !rol) {
    uso();
    process.exit(1);
  }

  if (!ROLES_VALIDOS.includes(rol)) {
    console.error(`Rol inválido "${rol}". Roles válidos: ${ROLES_VALIDOS.join(', ')}`);
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
    // El nombre de la tabla no puede ir como parámetro (bind), pero el
    // esquema/tabla provienen de nuestra propia configuración, no del usuario.
    const actual = await pool.query(
      `SELECT id, nombre, apellido, email, rol
         FROM "${esquema}".usuarios
        WHERE lower(email) = lower($1)`,
      [correo],
    );

    if (actual.rowCount === 0) {
      console.error(`No existe ningún usuario con el correo "${correo}".`);
      const listar = await pool.query(
        `SELECT email, rol FROM "${esquema}".usuarios ORDER BY id`,
      );
      console.table(listar.rows);
      process.exitCode = 1;
      return;
    }

    const usuario = actual.rows[0];
    console.log(`Usuario encontrado: ${usuario.nombre} ${usuario.apellido} (${usuario.email})`);
    console.log(`Rol actual: ${usuario.rol}  →  Rol nuevo: ${rol}`);

    if (usuario.rol === rol) {
      console.log('El rol ya era ese. No se hizo ningún cambio.');
      return;
    }

    const actualizado = await pool.query(
      `UPDATE "${esquema}".usuarios
          SET rol = $1, fecha_actualizacion = now()
        WHERE id = $2
        RETURNING id, nombre, apellido, email, rol, activo`,
      [rol, usuario.id],
    );

    console.log('✔ Rol actualizado:');
    console.table(actualizado.rows);
  } catch (error) {
    console.error('ERROR:', error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
