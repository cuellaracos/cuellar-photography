import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const sourceDir = 'D:\\amazon fotos\\subir a la web\\ASTRO_WEB_PROCESADAS';
const dataDir = path.join(projectRoot, 'src', 'data');
const publicImagesDir = path.join(projectRoot, 'public', 'images');
const catalogFile = path.join(projectRoot, 'scripts', 'catalogo-fotos.json');

const galleries = {
  paisaje: { name: 'Paisaje', slug: 'horizontes-abiertos', category: 'Paisaje', imageFolder: 'Paisaje', dataFile: path.join(dataDir, 'photos', 'horizontes-abiertos.ts') },
  naturaleza: { name: 'Naturaleza', slug: 'materia-viva', category: 'Naturaleza', imageFolder: 'Naturaleza', dataFile: path.join(dataDir, 'photos', 'materia-viva.ts') },
  fauna: { name: 'Fauna', slug: 'encuentros-silvestres', category: 'Fauna', imageFolder: 'Fauna', dataFile: path.join(dataDir, 'photos', 'encuentros-silvestres.ts') },
  macro: { name: 'Macro', slug: 'vida-en-detalle', category: 'Macro', imageFolder: 'Macro', dataFile: path.join(dataDir, 'photos', 'vida-en-detalle.ts') },
  nocturna: { name: 'Nocturna', slug: 'despues-del-sol', category: 'Nocturna', imageFolder: 'Nocturna', dataFile: path.join(dataDir, 'photos', 'despues-del-sol.ts') },
  astrofotografia: { name: 'Astrofotograf\u00eda', slug: 'cielo-profundo', category: 'Astrofotograf\u00eda', imageFolder: 'Astrofotografia', dataFile: path.join(dataDir, 'cielo-profundo.ts') },
  creativa: { name: 'Fotograf\u00eda creativa', slug: 'realidad-recompuesta', category: 'Fotograf\u00eda creativa', imageFolder: 'FotografiaCreativa', dataFile: path.join(dataDir, 'realidad-recompuesta.ts') },
  retratos: { name: 'Retratos', slug: 'retratos', category: 'Retratos', imageFolder: 'Retratos', dataFile: path.join(dataDir, 'retratos.ts') },
  ia: { name: 'Creaciones con IA', slug: 'creaciones-ia', category: 'Creaciones con IA', imageFolder: 'CreacionesIA', dataFile: path.join(dataDir, 'creaciones-ia.ts') },
};

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = question => new Promise(resolve => rl.question(question, answer => resolve(answer.trim())));

/*
 * Repairs the common UTF-8 -> Windows-1252/Latin-1 mojibake forms:
 *   Do\u00c3\u00b1ana -> Do\u00f1ana
 *   Do\u00c3\u0192\u00c2\u00b1ana -> Do\u00f1ana
 * Repeats until stable, but only keeps a repair when it reduces the
 * characteristic mojibake markers.
 */
function repairMojibake(value) {
  let s = String(value ?? '');
  for (let i = 0; i < 3; i++) {
    if (!/[\u00c3\u00c2\u00e2]|(?:\u00c3\u0192|\u00c2)/.test(s)) break;
    try {
      const repaired = Buffer.from(s, 'latin1').toString('utf8');
      if (repaired === s) break;
      if (countBad(s) <= countBad(repaired)) break;
      s = repaired;
    } catch {
      break;
    }
  }
  return s;
}
function countBad(s) {
  return (String(s).match(/[\u00c3\u00c2\u00e2\uFFFD]/g) || []).length
       + (String(s).match(/\u00c3\u0192|\u00c2/g) || []).length;
}

function normalizeKey(value) {
  const repaired = repairMojibake(value);
  return path.basename(repaired, path.extname(repaired))
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
function slugify(value) { return normalizeKey(value); }

function titleFromFilename(filename) {
  const text = repairMojibake(path.basename(filename, path.extname(filename)))
    .replace(/\s+/g, ' ')
    .replace(/[-_]+/g, ' ')
    .trim()
    .replace(/\s*\(\d{4}-\d{2}-\d{2}.*\)\s*$/, '');
  return text.charAt(0).toLocaleUpperCase('es-ES') + text.slice(1);
}
function cleanText(value) { return repairMojibake(value); }
function escapeTsString(value) {
  return cleanText(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function getImageDimensions(filePath) {
  const buffer = fs.readFileSync(filePath);
  if (buffer[0] === 0xff && buffer[1] === 0xd8) {
    let offset = 2;
    while (offset < buffer.length) {
      if (buffer[offset] !== 0xff) { offset++; continue; }
      const marker = buffer[offset + 1];
      if (marker === 0xd8 || marker === 0xd9) { offset += 2; continue; }
      const length = buffer.readUInt16BE(offset + 2);
      if (marker >= 0xc0 && marker <= 0xc3) {
        return { width: buffer.readUInt16BE(offset + 7), height: buffer.readUInt16BE(offset + 5) };
      }
      offset += 2 + length;
    }
  }
  throw new Error(`No se han podido leer las dimensiones de ${path.basename(filePath)}`);
}
function getFileHash(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex').toLowerCase();
}

function getRegisteredImagesAndHashes() {
  const registered = new Set();
  const hashes = new Set();

  function walk(directory) {
    if (!fs.existsSync(directory)) return;
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) { walk(fullPath); continue; }
      if (!entry.name.endsWith('.ts')) continue;

      const content = fs.readFileSync(fullPath, 'utf8');
      for (const match of content.matchAll(/(?:image|thumbnail):\s*['"`]([^'"`]+)['"`]/g)) {
        const imagePath = match[1];
        const basename = path.basename(imagePath);
        registered.add(basename.toLowerCase());
        registered.add(repairMojibake(basename).toLowerCase());

        const localPath = path.join(projectRoot, 'public', imagePath.replace(/^\/+/, ''));
        const repairedLocalPath = path.join(projectRoot, 'public', repairMojibake(imagePath).replace(/^\/+/, ''));
        for (const candidate of [localPath, repairedLocalPath]) {
          if (fs.existsSync(candidate)) {
            try { hashes.add(getFileHash(candidate)); } catch {}
          }
        }
      }
    }
  }
  walk(dataDir);
  return { registered, hashes };
}

function getExistingSlugs() {
  const slugs = new Set();
  function walk(directory) {
    if (!fs.existsSync(directory)) return;
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(fullPath);
      else if (entry.name.endsWith('.ts')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        for (const match of content.matchAll(/slug:\s*['"`]([^'"`]+)['"`]/g)) {
          slugs.add(cleanText(match[1]));
        }
      }
    }
  }
  walk(dataDir);
  return slugs;
}

function normalizeCatalogEntry(entry) {
  if (!entry || typeof entry !== 'object') return entry;
  const out = { ...entry };
  for (const key of ['gallery', 'title', 'description', 'alt', 'slug']) {
    if (typeof out[key] === 'string') out[key] = cleanText(out[key]);
  }
  if (out.slug) out.slug = slugify(out.slug);
  return out;
}

function loadCatalog() {
  if (!fs.existsSync(catalogFile)) return {};
  try {
    const raw = JSON.parse(fs.readFileSync(catalogFile, 'utf8'));
    const clean = {};
    for (const [key, value] of Object.entries(raw)) {
      clean[normalizeKey(key)] = normalizeCatalogEntry(value);
    }
    return clean;
  } catch {
    throw new Error(`El cat\u00e1logo no es JSON v\u00e1lido: ${catalogFile}`);
  }
}
function saveCatalog(catalog) {
  fs.writeFileSync(catalogFile, JSON.stringify(catalog, null, 2) + '\n', 'utf8');
}

function parseGallery(value) {
  if (!value) return null;
  const key = normalizeKey(value).replace(/^fotografia-/, '');
  return galleries[key]
    || Object.values(galleries).find(g =>
      normalizeKey(g.slug) === key ||
      normalizeKey(g.category) === key ||
      normalizeKey(g.name) === key
    )
    || null;
}

function createPhoto(filename, entry, gallery) {
  const dimensions = getImageDimensions(path.join(sourceDir, filename));
  const title = cleanText(entry?.title || titleFromFilename(filename));
  const slug = entry?.slug ? slugify(entry.slug) : slugify(title);
  return {
    id: `photo-${gallery.slug}-${slug}`,
    slug,
    title,
    description: cleanText(entry?.description || `Fotograf\u00eda de ${gallery.category.toLocaleLowerCase('es-ES')}: ${title}.`),
    alt: cleanText(entry?.alt || title),
    gallerySlug: gallery.slug,
    category: cleanText(gallery.category),
    image: `/images/${gallery.imageFolder}/${filename}`,
    thumbnail: `/images/${gallery.imageFolder}/${filename}`,
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

function appendPhotosToDataFile(dataFile, photos) {
  let content = fs.readFileSync(dataFile, 'utf8');
  const closingIndex = content.lastIndexOf('];');
  if (closingIndex === -1) throw new Error(`No se encontr\u00f3 el cierre del array en ${dataFile}`);
  content = content.slice(0, closingIndex).trimEnd() + '\n'
    + photos.map(photoToTs).join('\n') + '\n'
    + content.slice(closingIndex);
  fs.writeFileSync(dataFile, content, 'utf8');
}

function getNewFiles() {
  const { registered } = getRegisteredImagesAndHashes();
  return fs.readdirSync(sourceDir, { withFileTypes: true })
    .filter(e => e.isFile() && ['.jpg', '.jpeg', '.png', '.webp'].includes(path.extname(e.name).toLowerCase()))
    .map(e => e.name)
    .filter(filename => !registered.has(filename.toLowerCase()) && !registered.has(repairMojibake(filename).toLowerCase()));
}

function inferCatalogEntry(catalog, filename) {
  const rawStem = path.basename(filename, path.extname(filename));
  const candidates = [
    normalizeKey(filename),
    normalizeKey(rawStem),
    normalizeKey(rawStem.replace(/\s*\([^)]*\)\s*$/i, '')),
  ];

  const stripNoise = value => repairMojibake(value)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s*\(\d{4}-\d{2}-\d{2}[^)]*\)\s*$/i, '')
    .replace(/\s*\[[^\]]*\]\s*$/i, '')
    .replace(/\b(?:upscayl|standard|4x|2x|dxo|hq)\b/gi, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

  const compact = value => stripNoise(value).replace(/\s+/g, '');

  candidates.push(compact(rawStem));

  for (const key of candidates) {
    if (catalog[key]) return normalizeCatalogEntry(catalog[key]);
  }

  const targetWords = new Set(stripNoise(rawStem).split(/\s+/).filter(w => w.length >= 3));
  let best = null;
  let bestScore = 0;

  for (const [key, entry0] of Object.entries(catalog)) {
    const entry = normalizeCatalogEntry(entry0);
    const fields = [key, entry?.slug || '', entry?.title || '', entry?.alt || ''].map(stripNoise);
    const candidateWords = new Set(fields.join(' ').split(/\s+/).filter(w => w.length >= 3));
    if (!candidateWords.size || !targetWords.size) continue;

    let intersection = 0;
    for (const word of targetWords) if (candidateWords.has(word)) intersection++;

    const targetCompact = compact(rawStem);
    const candidateCompact = compact(fields.join(' '));

    let score = intersection;
    if (targetCompact && candidateCompact.includes(targetCompact)) score += 5;
    if (candidateCompact && targetCompact.includes(candidateCompact)) score += 3;

    if (score > bestScore) { bestScore = score; best = entry; }
  }

  return bestScore >= 2 ? best : null;
}

async function collectEntry(catalog, filename) {
  const inferred = inferCatalogEntry(catalog, filename);
  if (inferred) return { entry: inferred, known: true };

  console.log(`\n\u26a0 Fotograf\u00eda sin ficha: ${filename}`);
  console.log('Formato recomendado de categor\u00eda: paisaje, naturaleza, fauna, macro, nocturna, astrofotografia, creativa, retratos o ia.');

  const galleryInput = await ask('Galer\u00eda/categor\u00eda: ');
  const gallery = parseGallery(galleryInput);
  if (!gallery) throw new Error(`Categor\u00eda/galer\u00eda no v\u00e1lida para ${filename}.`);

  const title = cleanText(await ask(`T\u00edtulo [${titleFromFilename(filename)}]: `) || titleFromFilename(filename));
  const descriptionInput = cleanText(await ask('Descripci\u00f3n: '));
  const alt = cleanText(await ask(`Texto ALT [${title}]: `) || title);

  const description = descriptionInput || `Fotograf\u00eda de ${gallery.category.toLocaleLowerCase('es-ES')}: ${title}.`;
  const entry = { gallery: gallery.category, title, description, alt, slug: slugify(title) };

  catalog[normalizeKey(filename)] = entry;
  saveCatalog(catalog);
  console.log('\u2713 Ficha guardada en el cat\u00e1logo.');
  return { entry, known: false };
}

async function main() {
  console.log('\n==============================================');
  console.log('       IMPORTADOR DE FOTOGRAF\u00cdAS V2');
  console.log('==============================================\n');

  if (!fs.existsSync(sourceDir)) throw new Error(`No existe la carpeta de entrada:\n${sourceDir}`);

  const newFiles = getNewFiles();
  console.log(`Fotograf\u00edas nuevas detectadas: ${newFiles.length}\n`);
  if (!newFiles.length) return;

  newFiles.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
  console.log('');

  // FLUJO AUTOMÁTICO: todas las fotografías nuevas se procesan mediante el catálogo.
  // Solo se solicita información manual si una fotografía no tiene ficha.
  const selectedFiles = [...newFiles];

  console.log(`Se procesarán automáticamente las ${selectedFiles.length} fotografía(s) nuevas.`);
  console.log('');
  const { hashes } = getRegisteredImagesAndHashes();

  for (const filename of selectedFiles) {
    if (hashes.has(getFileHash(path.join(sourceDir, filename)))) {
      throw new Error(`La fotograf\u00eda ya existe con el mismo contenido: ${filename}`);
    }
  }

  const catalog = loadCatalog();
  const photos = [];

  console.log('==============================================');
  console.log('       CLASIFICACIÓN AUTOMÁTICA');
  console.log('==============================================');
  console.log('');

  for (const filename of selectedFiles) {
    const { entry, known } = await collectEntry(catalog, filename);
    const gallery = parseGallery(entry.gallery);
    if (!gallery) throw new Error(`La ficha de ${filename} contiene una galería no válida: ${entry.gallery}`);
    photos.push(createPhoto(filename, entry, gallery));
    console.log(`  ${known ? '✓' : '•'} ${filename} → ${gallery.name}${known ? '' : ' (ficha creada)'}`);
  }

  console.log('');
  console.log(`Se han clasificado ${photos.length} fotografía(s).`);
  console.log('');

  const existingSlugs = getExistingSlugs();
  const duplicateSlugs = photos.filter(p => existingSlugs.has(p.slug));
  if (duplicateSlugs.length) {
    throw new Error(`Slug ya existente: ${duplicateSlugs.map(p => p.slug).join(', ')}`);
  }

  console.log('\n==============================================');
  console.log('       VISTA PREVIA DEL LOTE');
  console.log('==============================================\n');

  for (const [i, p] of photos.entries()) {
    console.log(`--- ${i + 1}. ${p.title} ---`);
    console.log(`Archivo:      ${path.basename(p.image)}`);
    console.log(`Galer\u00eda:      ${p.gallerySlug}`);
    console.log(`Categor\u00eda:    ${p.category}`);
    console.log(`Slug:         ${p.slug}`);
    console.log(`Dimensiones:  ${p.width} \u00d7 ${p.height}`);
    console.log(`Descripci\u00f3n:  ${p.description}`);
    console.log(`ALT:          ${p.alt}\n`);
  }

  if ((await ask(`\u00bfImportar este lote de ${photos.length} fotograf\u00eda(s)? [SI/NO]: `)).toUpperCase() !== 'SI') {
    console.log('\nIMPORTACI\u00d3N CANCELADA.');
    return;
  }

  const groups = new Map();
  for (const photo of photos) {
    if (!groups.has(photo.gallerySlug)) groups.set(photo.gallerySlug, []);
    groups.get(photo.gallerySlug).push(photo);
  }

  const copiedFiles = [];
  try {
    for (const [gallerySlug, group] of groups) {
      const gallery = Object.values(galleries).find(g => g.slug === gallerySlug);
      const destinationDir = path.join(publicImagesDir, gallery.imageFolder);
      fs.mkdirSync(destinationDir, { recursive: true });

      for (const photo of group) {
        const sourcePath = path.join(sourceDir, path.basename(photo.image));
        const destinationPath = path.join(destinationDir, path.basename(photo.image));
        if (fs.existsSync(destinationPath)) throw new Error(`Ya existe el archivo destino:\n${destinationPath}`);
        fs.copyFileSync(sourcePath, destinationPath);
        copiedFiles.push(destinationPath);
      }

      appendPhotosToDataFile(gallery.dataFile, group);
    }
  } catch (error) {
    for (const file of copiedFiles) fs.rmSync(file, { force: true });
    throw error;
  }

  console.log('\n==============================================');
  console.log('       IMPORTACI\u00d3N COMPLETADA');
  console.log('==============================================\n');
  console.log(`\u2713 ${photos.length} fotograf\u00eda(s) importada(s)`);
  for (const [gallerySlug, group] of groups) console.log(`\u2713 ${group.length} \u2192 ${gallerySlug}`);
  console.log('\u2713 Im\u00e1genes copiadas');
  console.log('\u2713 Datos actualizados');
  console.log('\nNo se ha ejecutado Git.\n');
}

main()
  .catch(error => {
    console.error('\n==============================================\n       ERROR DURANTE LA IMPORTACI\u00d3N\n==============================================\n');
    console.error(error.message);
    console.error('');
    process.exitCode = 1;
  })
  .finally(() => rl.close());
