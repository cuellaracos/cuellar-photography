import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import readline from 'node:readline';
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

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question) {
  return new Promise(resolve => {
    rl.question(question, answer => {
      resolve(answer.trim());
    });
  });
}

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

function descriptionForCategory(category, title) {
  const descriptions = {
    Paisaje:
      `Fotografía de paisaje: ${title}.`,
    Naturaleza:
      `Fotografía de naturaleza: ${title}.`,
    Fauna:
      `Fotografía de fauna: ${title}.`,
    Macro:
      `Fotografía macro: ${title}.`,
    Nocturna:
      `Fotografía nocturna: ${title}.`,
    Astrofotografía:
      `Astrofotografía: ${title}.`,
    'Fotografía creativa':
      `Fotografía creativa: ${title}.`,
    Retratos:
      `Retrato: ${title}.`,
    'Creaciones con IA':
      `Creación visual realizada con inteligencia artificial: ${title}.`,
  };

  return descriptions[category] || `Fotografía: ${title}.`;
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
    `No se han podido leer las dimensiones de ${path.basename(filePath)}`
  );
}
function getFileHash(filePath) {
  const hash = crypto.createHash('sha256');
  const buffer = fs.readFileSync(filePath);
  hash.update(buffer);
  return hash.digest('hex').toLowerCase();
}

function getRegisteredHashes() {
  const hashes = new Set();

  function walk(directory) {
    if (!fs.existsSync(directory)) return;

    for (const entry of fs.readdirSync(directory, {
      withFileTypes: true,
    })) {
      const fullPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }

      if (!entry.name.endsWith('.ts')) continue;

      const content = fs.readFileSync(fullPath, 'utf8');

      const matches = content.matchAll(
        /(?:image|thumbnail):\s*['"`]([^'"`]+)['"`]/g
      );

      for (const match of matches) {
        const imagePath = match[1];

        if (!imagePath.startsWith('/images/')) continue;

        const localPath = path.join(
          projectRoot,
          'public',
          imagePath.replace(/^\/+/, '')
        );

        if (!fs.existsSync(localPath)) continue;

        try {
          hashes.add(getFileHash(localPath));
        } catch {
          // Si una imagen no puede leerse,
          // no bloqueamos el diagnóstico.
        }
      }
    }
  }

  walk(dataDir);

  return hashes;
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

function getNewFiles() {
  const registered = getRegisteredImages();
  const registeredHashes = getRegisteredHashes();

  return fs
    .readdirSync(sourceDir, {
      withFileTypes: true,
    })
    .filter(entry => {
      if (!entry.isFile()) return false;

      return [
        '.jpg',
        '.jpeg',
        '.png',
        '.webp',
      ].includes(
        path.extname(entry.name).toLowerCase()
      );
    })
    .map(entry => entry.name)
    .filter(file =>
      !registered.has(file.toLowerCase())
    );
}

function escapeTsString(value) {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'");
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

function createPhoto(filename, gallery) {
  const title = titleFromFilename(filename);

  const dimensions = getImageDimensions(
    path.join(sourceDir, filename)
  );

  return {
    id:
      `photo-${gallery.slug}-${slugify(filename)}`,

    slug:
      slugify(filename),

    title,

    description:
      descriptionForCategory(
        gallery.category,
        title
      ),

    alt:
      title,

    gallerySlug:
      gallery.slug,

    category:
      gallery.category,

    image:
      `/images/${gallery.imageFolder}/${filename}`,

    thumbnail:
      `/images/${gallery.imageFolder}/${filename}`,

    width:
      dimensions.width,

    height:
      dimensions.height,
  };
}

function appendPhotosToDataFile(dataFile, photos) {
  let content =
    fs.readFileSync(dataFile, 'utf8');

  const closingIndex =
    content.lastIndexOf('];');

  if (closingIndex === -1) {
    throw new Error(
      `No se encontró el cierre del array en ${dataFile}`
    );
  }

  const entries =
    photos
      .map(photoToTs)
      .join('\n');

  content =
    content.slice(0, closingIndex).trimEnd() +
    '\n' +
    entries +
    '\n' +
    content.slice(closingIndex);

  fs.writeFileSync(
    dataFile,
    content,
    'utf8'
  );
}

function parseSelection(input, max) {
  const numbers =
    input
      .split(',')
      .map(value =>
        Number.parseInt(
          value.trim(),
          10
        )
      )
      .filter(number =>
        !Number.isNaN(number)
      );

  const unique =
    [...new Set(numbers)];

  if (
    unique.length === 0 ||
    unique.some(number =>
      number < 1 ||
      number > max
    )
  ) {
    return null;
  }

  return unique.map(
    number => number - 1
  );
}

function getExistingSlugs() {
  const slugs = new Set();

  function walk(directory) {
    if (!fs.existsSync(directory)) return;

    for (const entry of fs.readdirSync(directory, {
      withFileTypes: true,
    })) {
      const fullPath =
        path.join(
          directory,
          entry.name
        );

      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (
        entry.name.endsWith('.ts')
      ) {
        const content =
          fs.readFileSync(
            fullPath,
            'utf8'
          );

        const matches =
          content.matchAll(
            /slug:\s*['"`]([^'"`]+)['"`]/g
          );

        for (const match of matches) {
          slugs.add(match[1]);
        }
      }
    }
  }

  walk(dataDir);

  return slugs;
}

async function customizePhoto(photo) {
  console.log('');
  console.log(
    `Personalizando: ${photo.title}`
  );
  console.log('');

  const title =
    await ask(
      `Título [${photo.title}]: `
    );

  if (title) {
    photo.title = title;
  }

  const description =
    await ask(
      `Descripción [${photo.description}]: `
    );

  if (description) {
    photo.description = description;
  }

  const alt =
    await ask(
      `Texto ALT [${photo.alt}]: `
    );

  if (alt) {
    photo.alt = alt;
  }
}

async function main() {
  console.log('');
  console.log('==============================================');
  console.log('       IMPORTADOR DE FOTOGRAFÍAS');
  console.log('==============================================');
  console.log('');

  if (!fs.existsSync(sourceDir)) {
    throw new Error(
      `No existe la carpeta de entrada:\n${sourceDir}`
    );
  }

  const newFiles = getNewFiles();

  console.log(
    `Fotografías nuevas detectadas: ${newFiles.length}`
  );

  console.log('');

  if (newFiles.length === 0) {
    console.log(
      'No hay fotografías nuevas para importar.'
    );
    return;
  }

  console.log('----------------------------------------------');
  console.log('FOTOGRAFÍAS DISPONIBLES');
  console.log('----------------------------------------------');
  console.log('');

  newFiles.forEach(
    (file, index) => {
      console.log(
        `  ${index + 1}. ${file}`
      );
    }
  );

  console.log('');

  let selectedIndexes = null;

  while (!selectedIndexes) {
    const selection =
      await ask(
        'Selecciona fotografías separadas por comas: '
      );

    selectedIndexes =
      parseSelection(
        selection,
        newFiles.length
      );

    if (!selectedIndexes) {
      console.log('');
      console.log(
        'Selección no válida. Ejemplo: 10,11,35'
      );
      console.log('');
    }
  }

  const selectedFiles =
    selectedIndexes.map(
      index => newFiles[index]
    );
const registeredHashes =
  getRegisteredHashes();

const exactDuplicates = [];

for (const filename of selectedFiles) {
  const sourcePath =
    path.join(sourceDir, filename);

  const hash =
    getFileHash(sourcePath);

  if (registeredHashes.has(hash)) {
    exactDuplicates.push({
      filename,
      hash,
    });
  }
}

if (exactDuplicates.length > 0) {
  console.log('');
  console.log(
    '=============================================='
  );
  console.log(
    '       DUPLICADOS EXACTOS DETECTADOS'
  );
  console.log(
    '=============================================='
  );
  console.log('');

  for (const duplicate of exactDuplicates) {
    console.log(
      `  ⚠ ${duplicate.filename}`
    );

    console.log(
      `    SHA-256: ${duplicate.hash}`
    );

    console.log('');
  }

  console.log(
    'Estas fotografías ya existen en la web'
  );
  console.log(
    'con el mismo contenido exacto.'
  );
  console.log('');

  console.log(
    'No se importará ninguna fotografía duplicada.'
  );
  console.log('');

  return;
}

  console.log('');
  console.log(
    `Has seleccionado ${selectedFiles.length} fotografía(s):`
  );
  console.log('');

  selectedFiles.forEach(file => {
    console.log(`  • ${file}`);
  });

  console.log('');

  console.log('----------------------------------------------');
  console.log('GALERÍAS');
  console.log('----------------------------------------------');
  console.log('');

  for (
    const [number, gallery]
    of Object.entries(galleries)
  ) {
    console.log(
      `  ${number}. ${gallery.name}`
    );
  }

  console.log('');

  let gallery = null;

  while (!gallery) {
    const gallerySelection =
      await ask(
        'Selecciona la galería (número): '
      );

    gallery =
      galleries[gallerySelection];

    if (!gallery) {
      console.log('');
      console.log(
        'Galería no válida.'
      );
      console.log('');
    }
  }

  console.log('');
  console.log(
    `Galería seleccionada: ${gallery.name}`
  );
  console.log('');

  const photos =
    selectedFiles.map(
      filename =>
        createPhoto(
          filename,
          gallery
        )
    );

  const customize =
    await ask(
      '¿Quieres personalizar los datos de las fotografías? [S/N]: '
    );

  if (
    customize.toUpperCase() === 'S'
  ) {
    for (
      const photo
      of photos
    ) {
      await customizePhoto(photo);
    }
  }

  const existingSlugs =
    getExistingSlugs();

  const duplicateSlugs =
    photos.filter(photo =>
      existingSlugs.has(photo.slug)
    );

  if (duplicateSlugs.length > 0) {
    console.log('');
    console.log(
      '=============================================='
    );
    console.log(
      '       POSIBLES DUPLICADOS'
    );
    console.log(
      '=============================================='
    );
    console.log('');

    duplicateSlugs.forEach(photo => {
      console.log(
        `  ⚠ ${photo.slug}`
      );
    });

    console.log('');

    throw new Error(
      'Una o más fotografías tienen un slug ya existente. No se ha importado ninguna.'
    );
  }

  console.log('');
  console.log(
    '=============================================='
  );
  console.log(
    '       VISTA PREVIA DEL LOTE'
  );
  console.log(
    '=============================================='
  );
  console.log('');

  photos.forEach(
    (photo, index) => {
      console.log(
        `--- ${index + 1}. ${photo.title} ---`
      );

      console.log(
        `Archivo:      ${path.basename(photo.image)}`
      );

      console.log(
        `Slug:         ${photo.slug}`
      );

      console.log(
        `Galería:      ${photo.gallerySlug}`
      );

      console.log(
        `Categoría:    ${photo.category}`
      );

      console.log(
        `Dimensiones:  ${photo.width} × ${photo.height}`
      );

      console.log(
        `Descripción:  ${photo.description}`
      );

      console.log(
        `ALT:          ${photo.alt}`
      );

      console.log('');
    }
  );

  console.log(
    `Se importarán ${photos.length} fotografía(s).`
  );

  console.log('');

  const confirmation =
    await ask(
      '¿Importar este lote? [SI/NO]: '
    );

  if (
    confirmation.toUpperCase() !== 'SI'
  ) {
    console.log('');
    console.log(
      'IMPORTACIÓN CANCELADA.'
    );
    console.log('');
    return;
  }

  console.log('');
  console.log(
    'Validando el lote antes de escribir...'
  );

  const destinationDir =
    path.join(
      publicImagesDir,
      gallery.imageFolder
    );

  const destinationPaths =
    photos.map(photo =>
      path.join(
        destinationDir,
        path.basename(photo.image)
      )
    );

  for (
    const destinationPath
    of destinationPaths
  ) {
    if (
      fs.existsSync(destinationPath)
    ) {
      throw new Error(
        `Ya existe el archivo destino:\n${destinationPath}`
      );
    }
  }

  fs.mkdirSync(
    destinationDir,
    {
      recursive: true,
    }
  );

  const copiedFiles = [];

  try {
    for (
      let i = 0;
      i < photos.length;
      i++
    ) {
      const photo =
        photos[i];

      const sourcePath =
        path.join(
          sourceDir,
          path.basename(
            photo.image
          )
        );

      const destinationPath =
        destinationPaths[i];

      fs.copyFileSync(
        sourcePath,
        destinationPath
      );

      copiedFiles.push(
        destinationPath
      );
    }

    appendPhotosToDataFile(
      gallery.dataFile,
      photos
    );
  } catch (error) {
    for (
      const file
      of copiedFiles
    ) {
      fs.rmSync(
        file,
        {
          force: true,
        }
      );
    }

    throw error;
  }

  console.log('');
  console.log(
    '=============================================='
  );
  console.log(
    '       IMPORTACIÓN COMPLETADA'
  );
  console.log(
    '=============================================='
  );
  console.log('');

  console.log(
    `✓ ${photos.length} fotografía(s) importada(s)`
  );

  console.log(
    `✓ Galería: ${gallery.name}`
  );

  console.log(
    '✓ Imágenes copiadas'
  );

  console.log(
    '✓ Datos actualizados'
  );

  console.log('');
  console.log(
    'No se ha ejecutado Git.'
  );

  console.log(
    'No se ha hecho commit.'
  );

  console.log(
    'No se ha hecho push.'
  );

  console.log('');
}

main()
  .catch(error => {
    console.error('');
    console.error(
      '=============================================='
    );
    console.error(
      '       ERROR DURANTE LA IMPORTACIÓN'
    );
    console.error(
      '=============================================='
    );
    console.error('');
    console.error(
      error.message
    );
    console.error('');
    process.exitCode = 1;
  })
  .finally(() => {
    rl.close();
  });