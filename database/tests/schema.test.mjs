import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';

const migrationUrl = new URL('../migrations/0001_initial.sql', import.meta.url);
const migration = await readFile(migrationUrl, 'utf8');
const now = '2026-08-18T00:00:00.000Z';
const hash = 'a'.repeat(64);

function createDatabase() {
  const database = new DatabaseSync(':memory:');
  database.exec(migration);
  database.exec('PRAGMA foreign_keys = ON;');
  return database;
}

function expectConstraint(database, sql, message) {
  assert.throws(() => database.exec(sql), message);
}

function seedCategory(database, { id = 'category-active', slug = 'paisaje', status = 'active' } = {}) {
  database.prepare(`INSERT INTO categories (id, slug, name, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)`)
    .run(id, slug, slug, status, now, now);
}

function seedGallery(database, { id = 'gallery-1', slug = 'galeria-uno', categoryId = null, status = 'draft' } = {}) {
  database.prepare(`INSERT INTO galleries (id, slug, title, description, category_id, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, slug, 'Galería', 'Descripción válida', categoryId, status, now, now);
}

function seedPhoto(database, { id = 'photo-1', slug = 'foto-uno', categoryId = 'category-active', status = 'draft' } = {}) {
  database.prepare(`INSERT INTO photos (id, slug, title, description, alt, category_id, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, slug, 'Foto', 'Descripción válida', 'Texto alternativo válido', categoryId, status, now, now);
}

function linkPhoto(database, galleryId = 'gallery-1', photoId = 'photo-1') {
  database.prepare(`INSERT INTO photo_galleries (gallery_id, photo_id, created_at)
    VALUES (?, ?, ?)`)
    .run(galleryId, photoId, now);
}

function seedAsset(database, {
  id = 'asset-1',
  photoId = 'photo-1',
  kind = 'detail',
  key = 'public/photos/photo-1/asset-1/detail.webp',
  current = 0,
  state = 'ready',
} = {}) {
  const isOriginal = kind === 'original';
  database.prepare(`INSERT INTO photo_assets (
      id, photo_id, kind, storage_key, public_url, mime_type, file_extension,
      width, height, byte_size, checksum_sha256, state, is_current, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(
      id,
      photoId,
      kind,
      key,
      isOriginal ? null : `https://media.example/${key}`,
      isOriginal ? 'image/jpeg' : 'image/webp',
      isOriginal ? 'jpg' : 'webp',
      isOriginal ? null : 1600,
      isOriginal ? null : 1067,
      1,
      hash,
      state,
      current,
      now,
    );
}

function seedVersion(database, { id = 'version-1', status = 'generated', deploymentId = null, deployedAt = null } = {}) {
  database.prepare(`INSERT INTO publication_versions (
      id, catalog_key, catalog_hash, status, deployment_id, created_at, deployed_at, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, `public/catalogs/${id}.json`, hash, status, deploymentId, now, deployedAt, 'test-owner');
}

const tests = [
  ['PK, UNIQUE y CHECK', () => {
    const database = createDatabase();
    seedCategory(database);
    expectConstraint(database, `INSERT INTO categories (id, slug, name, status, created_at, updated_at)
      VALUES ('category-active', 'otro', 'Otro', 'active', '${now}', '${now}')`, 'primary key duplicate');
    expectConstraint(database, `INSERT INTO categories (id, slug, name, status, created_at, updated_at)
      VALUES ('category-2', 'paisaje', 'Otro', 'active', '${now}', '${now}')`, 'unique slug duplicate');
    expectConstraint(database, `INSERT INTO categories (id, slug, name, status, created_at, updated_at)
      VALUES ('category-3', 'invalida', 'Inválida', 'invalid', '${now}', '${now}')`, 'invalid category status');
  }],
  ['FK y ON DELETE/ON UPDATE RESTRICT', () => {
    const database = createDatabase();
    seedCategory(database);
    seedPhoto(database);
    expectConstraint(database, `DELETE FROM categories WHERE id = 'category-active'`, 'referenced category deletion');
    expectConstraint(database, `UPDATE categories SET id = 'category-renamed' WHERE id = 'category-active'`, 'referenced category update');
    expectConstraint(database, `INSERT INTO photos (id, slug, title, description, alt, category_id, created_at, updated_at)
      VALUES ('photo-invalid', 'invalida', 'Foto', 'Descripción', 'Alt', 'missing-category', '${now}', '${now}')`, 'missing category foreign key');
  }],
  ['Estados válidos e inválidos', () => {
    const database = createDatabase();
    seedCategory(database);
    expectConstraint(database, `INSERT INTO photos (id, slug, title, description, alt, category_id, status, created_at, updated_at)
      VALUES ('photo-invalid', 'invalida', 'Foto', 'Descripción', 'Alt', 'category-active', 'visible', '${now}', '${now}')`, 'invalid photo status');
    expectConstraint(database, `INSERT INTO publication_versions (id, catalog_key, catalog_hash, status, created_at, created_by)
      VALUES ('version-invalid', 'invalid.json', '${hash}', 'unknown', '${now}', 'test-owner')`, 'invalid version status');
    expectConstraint(database, `INSERT INTO publication_versions (id, catalog_key, catalog_hash, status, created_at, created_by)
      VALUES ('version-deploying', 'deploying.json', '${hash}', 'deploying', '${now}', 'test-owner')`, 'deploying without deployment id');
  }],
  ['Una única versión live', () => {
    const database = createDatabase();
    seedVersion(database, { id: 'version-live-1', status: 'live', deploymentId: 'deploy-1', deployedAt: now });
    expectConstraint(database, `INSERT INTO publication_versions (
      id, catalog_key, catalog_hash, status, deployment_id, created_at, deployed_at, created_by
    ) VALUES ('version-live-2', 'live-2.json', '${hash}', 'live', 'deploy-2', '${now}', '${now}', 'test-owner')`, 'second live version');
  }],
  ['Un único asset current por foto y tipo', () => {
    const database = createDatabase();
    seedCategory(database);
    seedPhoto(database);
    seedAsset(database, { id: 'detail-current-1', current: 1 });
    expectConstraint(database, `INSERT INTO photo_assets (
      id, photo_id, kind, storage_key, public_url, mime_type, file_extension, width, height,
      byte_size, checksum_sha256, state, is_current, created_at
    ) VALUES ('detail-current-2', 'photo-1', 'detail', 'detail-2.webp', 'https://media.example/detail-2.webp', 'image/webp', 'webp', 1600, 1067, 1, '${hash}', 'ready', 1, '${now}')`, 'second current detail');
  }],
  ['Conflicto de slug actual y alias de foto', () => {
    const database = createDatabase();
    seedCategory(database);
    seedPhoto(database);
    expectConstraint(database, `INSERT INTO photo_slug_aliases (photo_id, slug, created_at)
      VALUES ('photo-1', 'foto-uno', '${now}')`, 'alias matching current slug');
    database.prepare(`INSERT INTO photo_slug_aliases (photo_id, slug, created_at) VALUES (?, ?, ?)`)
      .run('photo-1', 'foto-anterior', now);
    expectConstraint(database, `INSERT INTO photos (id, slug, title, description, alt, category_id, created_at, updated_at)
      VALUES ('photo-2', 'foto-anterior', 'Foto', 'Descripción', 'Alt', 'category-active', '${now}', '${now}')`, 'current slug matching alias');
  }],
  ['Conflicto de slug actual y alias de galería', () => {
    const database = createDatabase();
    seedGallery(database);
    expectConstraint(database, `INSERT INTO gallery_slug_aliases (gallery_id, slug, created_at)
      VALUES ('gallery-1', 'galeria-uno', '${now}')`, 'alias matching current slug');
    database.prepare(`INSERT INTO gallery_slug_aliases (gallery_id, slug, created_at) VALUES (?, ?, ?)`)
      .run('gallery-1', 'galeria-anterior', now);
    expectConstraint(database, `INSERT INTO galleries (id, slug, title, description, status, created_at, updated_at)
      VALUES ('gallery-2', 'galeria-anterior', 'Galería', 'Descripción', 'draft', '${now}', '${now}')`, 'current slug matching alias');
  }],
  ['Cover photo debe pertenecer a la galería', () => {
    const database = createDatabase();
    seedCategory(database);
    seedGallery(database);
    seedPhoto(database);
    expectConstraint(database, `UPDATE galleries SET cover_photo_id = 'photo-1' WHERE id = 'gallery-1'`, 'cover without membership');
    linkPhoto(database);
    database.exec(`UPDATE galleries SET cover_photo_id = 'photo-1' WHERE id = 'gallery-1'`);
    expectConstraint(database, `DELETE FROM photo_galleries WHERE gallery_id = 'gallery-1' AND photo_id = 'photo-1'`, 'cover relationship deletion');
  }],
  ['Portada publicada no puede archivarse', () => {
    const database = createDatabase();
    seedCategory(database);
    seedGallery(database, { status: 'published' });
    seedPhoto(database, { status: 'published' });
    linkPhoto(database);
    database.exec(`UPDATE galleries SET cover_photo_id = 'photo-1' WHERE id = 'gallery-1'`);
    expectConstraint(database, `UPDATE photos SET status = 'archived' WHERE id = 'photo-1'`, 'archiving a published cover');
  }],
  ['Categorías archived no se asignan a contenido nuevo', () => {
    const database = createDatabase();
    seedCategory(database, { id: 'category-archived', slug: 'archivada', status: 'archived' });
    expectConstraint(database, `INSERT INTO photos (id, slug, title, description, alt, category_id, created_at, updated_at)
      VALUES ('photo-archived-category', 'foto', 'Foto', 'Descripción', 'Alt', 'category-archived', '${now}', '${now}')`, 'archived category photo assignment');
    expectConstraint(database, `INSERT INTO galleries (id, slug, title, description, category_id, created_at, updated_at)
      VALUES ('gallery-archived-category', 'galeria', 'Galería', 'Descripción', 'category-archived', '${now}', '${now}')`, 'archived category gallery assignment');
  }],
  ['Categorías archived conservan referencias históricas y los slugs tienen espacios separados', () => {
    const database = createDatabase();
    seedCategory(database);
    seedPhoto(database, { slug: 'misma-ruta' });
    seedGallery(database, { slug: 'misma-ruta', categoryId: 'category-active' });
    database.exec(`UPDATE categories SET status = 'archived' WHERE id = 'category-active'`);
    const photo = database.prepare(`SELECT category_id FROM photos WHERE id = 'photo-1'`).get();
    const gallery = database.prepare(`SELECT category_id FROM galleries WHERE id = 'gallery-1'`).get();
    assert.equal(photo.category_id, 'category-active');
    assert.equal(gallery.category_id, 'category-active');
  }],
  ['Photo galleries y publication version assets mantienen integridad', () => {
    const database = createDatabase();
    seedCategory(database);
    seedGallery(database);
    seedPhoto(database);
    expectConstraint(database, `INSERT INTO photo_galleries (gallery_id, photo_id, created_at)
      VALUES ('gallery-1', 'missing-photo', '${now}')`, 'missing photo link');
    linkPhoto(database);
    expectConstraint(database, `INSERT INTO photo_galleries (gallery_id, photo_id, created_at)
      VALUES ('gallery-1', 'photo-1', '${now}')`, 'duplicate photo gallery link');
    seedAsset(database);
    seedVersion(database);
    database.prepare(`INSERT INTO publication_version_assets (publication_version_id, photo_asset_id, created_at)
      VALUES (?, ?, ?)`)
      .run('version-1', 'asset-1', now);
    expectConstraint(database, `DELETE FROM photo_assets WHERE id = 'asset-1'`, 'referenced asset deletion');
    expectConstraint(database, `INSERT INTO publication_version_assets (publication_version_id, photo_asset_id, created_at)
      VALUES ('version-1', 'missing-asset', '${now}')`, 'missing asset version reference');
  }],
  ['Assets y rollback protected aplican constraints', () => {
    const database = createDatabase();
    seedCategory(database);
    seedPhoto(database);
    expectConstraint(database, `INSERT INTO photo_assets (
      id, photo_id, kind, storage_key, public_url, mime_type, file_extension, width, height,
      byte_size, checksum_sha256, state, is_current, created_at
    ) VALUES ('asset-invalid', 'photo-1', 'detail', 'invalid.webp', NULL, 'image/webp', 'webp', 1600, 1067, 1, '${hash}', 'ready', 0, '${now}')`, 'detail without public URL');
    expectConstraint(database, `INSERT INTO publication_versions (id, catalog_key, catalog_hash, rollback_protected, created_at, created_by)
      VALUES ('version-invalid-rollback', 'rollback.json', '${hash}', 2, '${now}', 'test-owner')`, 'invalid rollback flag');
  }],
];

let failures = 0;

for (const [name, test] of tests) {
  try {
    test();
    console.log(`PASS ${name}`);
  } catch (error) {
    failures += 1;
    console.error(`FAIL ${name}`);
    console.error(error);
  }
}

if (failures > 0) {
  process.exitCode = 1;
} else {
  console.log(`PASS ${tests.length} schema tests`);
}