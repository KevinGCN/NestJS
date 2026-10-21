-- CreateTable: almacenamiento binario de imágenes en la base de datos.
-- La columna "data" es BYTEA (bytea) y guarda el archivo original
-- (jpeg/png/webp). Las URLs públicas se sirven desde
-- GET /api/imagenes/:id, por lo que no se depende del disco del servidor.
-- (No se usa CREATE SCHEMA: el usuario de la BD no tiene permiso sobre la
--  base de datos, solo sobre el esquema "proyecto7".)

-- CreateTable
CREATE TABLE "proyecto7"."imagenes" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "tamano" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "fecha_subida" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "imagenes_pkey" PRIMARY KEY ("id")
);
