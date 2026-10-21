// Diagnóstico 2: permisos por esquema y contenido real de proyecto7
const { Pool } = require('pg');
require('dotenv').config();

(async () => {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  const quien = await pool.query(
    `SELECT current_user AS usuario, current_database() AS base`);
  console.log('== CONEXION =='); console.table(quien.rows);

  const esquemas = await pool.query(`
    SELECT n.nspname AS esquema,
           pg_catalog.has_schema_privilege(current_user, n.nspname, 'USAGE') AS puede_usar,
           pg_catalog.has_schema_privilege(current_user, n.nspname, 'CREATE') AS puede_crear
    FROM pg_namespace n
    WHERE n.nspname NOT LIKE 'pg_%'
      AND n.nspname <> 'information_schema'
    ORDER BY 1`);
  console.log('== ESQUEMAS VISIBLES Y PERMISOS =='); console.table(esquemas.rows);

  const tablas = await pool.query(`
    SELECT c.relname AS tabla,
           (xpath('/row/c/text()', query_to_xml(
             format('SELECT count(*) AS c FROM %I.%I', 'proyecto7', c.relname),
             false, true, '')))[1]::text::int AS filas
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'r' AND n.nspname = 'proyecto7'
    ORDER BY 1`);
  console.log('== TABLAS EN proyecto7 =='); console.table(tablas.rows);

  const searchPath = await pool.query(
    `SELECT current_setting('search_path') AS search_path,
            (SELECT rolsuper FROM pg_roles WHERE rolname = current_user) AS es_superuser`);
  console.log('== SESION =='); console.table(searchPath.rows);

  await pool.end();
})().catch((e) => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
