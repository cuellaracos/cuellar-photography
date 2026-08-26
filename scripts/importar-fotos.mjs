import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const sourceDir =
  'D:\\amazon fotos\\subir a la web\\ASTRO_WEB_PROCESADAS';

const dataDir =
  path.join(projectRoot, 'src', 'data');

const publicImagesDir =
  path.join(projectRoot, 'public', 'images');

const galleries = {
  '1': {
    name: 'Horizontes abiertos',
    slug: 'horizontes-abiertos',
    category: 'Paisaje',
    imageFolder: 'Paisaje',
    dataFile: path.join(dataDir, 'photos', 'horizontes-abiertos.ts'),
  },

  '2': {
    name: 'Materia viva',
    slug: 'materia-viva',
    category: 'Naturaleza',
    imageFolder: 'Naturaleza',
    dataFile: path.join(dataDir, 'photos', 'materia-viva.ts'),
  },

  '3': {
    name: 'Encuentros Silvestres',
    slug: 'encuentros-silvestres',
    category: 'Fauna',
    imageFolder: 'Fauna',
    dataFile: path.join(dataDir, 'photos', 'encuentros-silvestres.ts'),
  },

  '4': {
    name: 'Vida en detalle',
    slug: 'vida-en-detalle',
    category: 'Macro',
    imageFolder: 'Macro',
    dataFile: path.join(dataDir, 'photos', 'vida-en-detalle.ts'),
  },

  '5': {
    name: 'Después del sol',
    slug: 'despues-del-sol',
    category: 'Nocturna',
    imageFolder: 'Nocturna',
    dataFile: path.join(dataDir, 'photos', 'despues-del-sol.ts'),
  },

  '6': {
    name: 'Cielo profundo',
    slug: 'cielo-profundo',
    category: 'Astrofotografía',
    imageFolder: 'Astrofotografia',
    dataFile: path.join(dataDir, 'cielo-profundo.ts'),
  },

  '7': {
    name: 'Realidad recompuesta',
    slug: 'realidad-recompuesta',
    category: 'Fotografía creativa',
    imageFolder: 'FotografiaCreativa',
    dataFile: path.join(dataDir, 'realidad-recompuesta.ts'),
  },

  '8': {
    name: 'Retratos',
    slug: 'retratos',
    category: 'Retratos',
    imageFolder: 'Retratos',
    dataFile: path.join(dataDir, 'retratos.ts'),
  },

  '9': {
    name: 'Creaciones con IA',
    slug: 'creaciones-ia',
    category: 'Creaciones con IA',
    imageFolder: 'CreacionesIA',
    dataFile: path.join(dataDir, 'creaciones-ia.ts'),
  },
};

function slugify(filename) {
  return path
    .basename(filename, path.extname(filename))
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function titleFromFilename(filename) {
  return path
    .basename(filename, path.extname(filename))
    .replace(/\s+/g, ' ')
    .replace(/[-_]+/g, ' ')
    .trim()
    .replace(/\b\w/g, char => char.toUpperCase());
}

function getImageDimensions(filePath) {
  const buffer = fs.readFileSync(filePath);

  if (buffer[0] === 0xff && buffer[1] === 0xd8) {
    let offset = 2;

    while (offset < buffer.length) {
      if (buffer[offset] !== 0xff) {
        offset++;
        continue;
      }

      const marker = buffer[offset + 1];

      if (marker === 0xd8 || marker === 0xd9) {
        offset += 2;
        continue;
      }

      const length = buffer.readUInt16BE(offset + 2);

      if (marker >= 0xc0 && marker <= 0xc3) {
        return {
          width: buffer.readUInt16BE(offset + 7),
          height: buffer.readUInt16BE(offset + 5),
        };
      }

      offset += 2 + length;
    }
  }

  throw new Error(
    'No se han podido leer las dimensiones de la imagen.'
  );
}

function getRegisteredImages() {
  const registered = new Set();

  function walk(directory) {
    if (!fs.existsSync(directory)) return;

    for (const entry of fs.readdirSync(directory, {
      withFileTypes: true,
    })) {
      const fullPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.name.endsWith('.ts')) {
        const content = fs.readFileSync(fullPath, 'utf8');

        const matches = content.matchAll(
          /(?:image|thumbnail):\s*['"`]([^'"`]+)['"`]/g
        );

        for (const match of matches) {
          registered.add(
            path.basename(match[1]).toLowerCase()
          );
        }
      }
    }
  }

  walk(dataDir);

  return registered;
}

function escapeTsString(value) {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'");
}

function createPhotoObject({
  selectedFile,
  gallery,
  title,
  description,
  alt,
}) {
  const sourcePath = path.join(sourceDir, selectedFile);
  const dimensions = getImageDimensions(sourcePath);
  const slug = slugify(selectedFile);

  return {
    id: `photo-${gallery.category.toLowerCase()}-${slug}`,
    slug,
    title,
    description,
    alt,
    gallerySlug: gallery.slug,
    category: gallery.category,
    image: `/images/${gallery.imageFolder}/${selectedFile}`,
    thumbnail: `/images/${gallery.imageFolder}/${selectedFile}`,
    width: dimensions.width,
    height: dimensions.height,
  };
}

function photoToTs(photo) {
  return `  {
    id: '${escapeTsString(photo.id)}',
    slug: '${escapeTsString(photo.slug)}',
    title: '${escapeTsString(photo.title)}',
    description: '${escapeTsString(photo.description)}',
    alt: '${escapeTsString(photo.alt)}',
    gallerySlug: '${escapeTsString(photo.gallerySlug)}',
    category: '${escapeTsString(photo.category)}',
    image: '${escapeTsString(photo.image)}',
    thumbnail: '${escapeTsString(photo.thumbnail)}',
    width: ${photo.width},
    height: ${photo.height},
  },`;
}

function appendPhotoToDataFile(dataFile, photo) {
  let content = fs.readFileSync(dataFile, 'utf8');

  const closingIndex = content.lastIndexOf('];');

  if (closingIndex === -1) {
    throw new Error(
      `No se encontró el cierre del array en ${dataFile}`
    );
  }

  const entry = photoToTs(photo);

  const before = content.slice(0, closingIndex);
  const after = content.slice(closingIndex);

  const separator = before.trimEnd().endsWith(',')
    ? '\n'
    : ',\n';

  content =
    before.trimEnd() +
    separator +
    entry +
    '\n' +
    after;

  fs.writeFileSync(dataFile, content, 'utf8');
}

console.log('');
console.log('==============================================');
console.log('       IMPORTADOR DE FOTOGRAFÍAS');
console.log('==============================================');
console.log('');

if (!fs.existsSync(sourceDir)) {
  console.error('ERROR: No existe la carpeta de entrada.');
  process.exit(1);
}

const selectedName = process.argv[2];
const galleryNumber = process.argv[3];

if (!selectedName || !galleryNumber) {
  console.log('Uso:');
  console.log('');
  console.log(
    'node scripts/importar-fotos.mjs "ana-durmiendo.jpg" 8'
  );
  console.log('');
  process.exit(1);
}

const gallery = galleries[galleryNumber];

if (!gallery) {
  console.error(
    `ERROR: La galería "${galleryNumber}" no existe.`
  );
  process.exit(1);
}

const registeredImages = getRegisteredImages();

if (registeredImages.has(selectedName.toLowerCase())) {
  console.error(
    `ERROR: "${selectedName}" ya aparece registrada en la web.`
  );
  process.exit(1);
}

const sourcePath = path.join(sourceDir, selectedName);

if (!fs.existsSync(sourcePath)) {
  console.error(
    `ERROR: No existe "${sourcePath}".`
  );
  process.exit(1);
}

const slug = slugify(selectedName);
const defaultTitle = titleFromFilename(selectedName);

const title =
  process.argv[4] || defaultTitle;

const description =
  process.argv[5] ||
  `Fotografía de ${title.toLowerCase()}.`;

const alt =
  process.argv[6] ||
  title;

const photo = createPhotoObject({
  selectedFile: selectedName,
  gallery,
  title,
  description,
  alt,
});

const destinationDir =
  path.join(
    publicImagesDir,
    gallery.imageFolder
  );

const destinationPath =
  path.join(
    destinationDir,
    selectedName
  );

if (fs.existsSync(destinationPath)) {
  console.error(
    `ERROR: Ya existe el archivo destino:\n${destinationPath}`
  );
  process.exit(1);
}

console.log('Fotografía:');
console.log(`  ${selectedName}`);
console.log('');

console.log('Galería:');
console.log(`  ${gallery.name}`);
console.log('');

console.log('Objeto que se añadirá:');
console.log('');
console.log(photoToTs(photo));

console.log('Destino de imagen:');
console.log(`  ${destinationPath}`);
console.log('');

console.log('Archivo de datos:');
console.log(`  ${gallery.dataFile}`);
console.log('');

console.log('IMPORTANTE:');
console.log('Esta operación modificará dos cosas:');
console.log('  1. Copiará la fotografía.');
console.log('  2. Añadirá el registro al archivo de datos.');
console.log('');

const confirmation =
  process.argv[7]?.toUpperCase();

if (confirmation !== 'SI') {
  console.log(
    'IMPORTACIÓN CANCELADA.'
  );
  console.log('');
  console.log(
    'Para confirmar añade SI al final del comando.'
  );
  console.log('');
  console.log(
    'Ejemplo:'
  );
  console.log(
    'node scripts/importar-fotos.mjs "ana-durmiendo.jpg" 8 "Ana Durmiendo" "Retrato de Ana bajo la luna." "Ana bajo la luna." SI'
  );
  console.log('');
  process.exit(0);
}

fs.mkdirSync(destinationDir, {
  recursive: true,
});

fs.copyFileSync(
  sourcePath,
  destinationPath
);

try {
  appendPhotoToDataFile(
    gallery.dataFile,
    photo
  );
} catch (error) {
  fs.rmSync(destinationPath, {
    force: true,
  });

  throw error;
}

console.log('');
console.log('==============================================');
console.log('       IMPORTACIÓN COMPLETADA');
console.log('==============================================');
console.log('');
console.log(`✓ Imagen copiada: ${selectedName}`);
console.log(`✓ Galería: ${gallery.name}`);
console.log(`✓ Datos actualizados: ${gallery.dataFile}`);
console.log('');
console.log('NO se ha ejecutado Git.');
console.log('NO se ha hecho commit.');
console.log('NO se ha hecho push.');
console.log('');