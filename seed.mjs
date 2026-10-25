// Carga en la DB los 6 tatuadores y las 7 imágenes que antes estaban fijas en el frontend.
// Uso (con el backend corriendo):  node seed.mjs      — ejecútalo UNA sola vez.
import { randomUUID } from 'node:crypto';

const API = process.env.API ?? 'http://localhost:3000';

async function post(path, body) {
  const res = await fetch(API + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${path} → ${res.status} ${await res.text()}`);
  return res.json();
}

const tatuadores = [
  ['Emilia', 'Soplano', 'emilia.soplano', 'Estilo Anime', 'image/Emilia Soplano.jpg',
    'Tatuadora especializada en anime y Dragon Ball: líneas que parecen Kamehamehas y color digno de una esfera del dragón.'],
  ['Gabe', 'Fernandez', 'gabe.fernandez', 'Realismo y Fantasía Oscura', 'image/Gabe Fernandez.jpg',
    'Tatuador especializado en estilo Souls: cinismo, armaduras rotas y fuegos fatuos con la misma elegancia oscura de morir una y otra vez.'],
  ['Juan David', 'Vernadez', 'juan.vernadez', 'Arte Fantástico y de videojuegos', 'image/Juan David Vernadez.webp',
    'Soy bueno dandole caracteristicas unicas a los personajes.'],
  ['Valentina', 'Ríos', 'valentina.rios', 'Minimalismo', 'image/Valentina Ríos.jpg',
    'Tatuadora de mundos fantasticos: personajes memorables, magia arcana y KasuGOD > Basuro.'],
  ['Sebastián', 'Morales', 'sebastian.morales', 'Chivi', 'image/Sebastián Morales.jpg',
    'Soy experto en hacer arte lindo y adorable.'],
  ['Leonardo', 'Taza', 'leonardo.taza', 'Warhammer 40k', 'image/Leonardo Taza.png',
    'Quieres el tatuaje de una monja de batalla con lanzallamas? Pues si la respuesta es si, yo soy tu hombre.'],
];

// [archivo, título, índice del tatuador (0 = Emilia ... 5 = Leonardo)]
const imagenes = [
  ['image/DBZ.jpg', 'Goku Y Vegeta', 0],
  ['image/arquemis.png', 'Arquemis', 0],
  ['image/ladymaria.png', 'Lady Maria', 1],
  ['image/mercy.png', 'Mercy', 2],
  ['image/rem.png', 'Rem', 3],
  ['image/kuromi.jpg', 'Kuromi', 4],
  ['image/sorodita.png', 'Sorodita', 5],
];

const creados = [];
for (const [nombre, apellido, correo, especialidad, foto, biografia] of tatuadores) {
  const u = await post('/usuarios', {
    nombre, apellido, email: `${correo}@example.com`, password: randomUUID(), foto_perfil_url: foto,
  });
  const e = await post('/empleados', { usuario_id: u.id, especialidad, biografia });
  creados.push({ empleadoId: e.id, usuarioId: u.id });
  console.log(`Tatuador creado: ${nombre} ${apellido} (empleado ${e.id})`);
}

for (const [imagen_url, titulo, i] of imagenes) {
  await post('/galeria', {
    subido_por: creados[i].usuarioId, empleado_id: creados[i].empleadoId, imagen_url, titulo,
  });
  console.log(`Imagen creada: ${titulo}`);
}
console.log('Listo.');
