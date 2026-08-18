PRAGMA foreign_keys = ON;

CREATE TABLE categories (
  id TEXT PRIMARY KEY NOT NULL,
  slug TEXT NOT NULL UNIQUE CHECK (length(trim(slug)) > 0),
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE galleries (
  id TEXT PRIMARY KEY NOT NULL,
  slug TEXT NOT NULL UNIQUE CHECK (length(trim(slug)) > 0),
  title TEXT NOT NULL CHECK (length(trim(title)) > 0),
  description TEXT NOT NULL CHECK (length(trim(description)) > 0),
  category_id TEXT REFERENCES categories(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  cover_photo_id TEXT REFERENCES photos(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  published_at TEXT,
  archived_at TEXT
);

CREATE TABLE photos (
  id TEXT PRIMARY KEY NOT NULL,
  slug TEXT NOT NULL UNIQUE CHECK (length(trim(slug)) > 0),
  title TEXT NOT NULL CHECK (length(trim(title)) > 0),
  description TEXT NOT NULL CHECK (length(trim(description)) > 0),
  alt TEXT NOT NULL CHECK (length(trim(alt)) > 0),
  category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  published_at TEXT,
  archived_at TEXT
);

CREATE TABLE photo_galleries (
  gallery_id TEXT NOT NULL REFERENCES galleries(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  photo_id TEXT NOT NULL REFERENCES photos(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  PRIMARY KEY (gallery_id, photo_id)
);

CREATE TABLE photo_assets (
  id TEXT PRIMARY KEY NOT NULL,
  photo_id TEXT NOT NULL REFERENCES photos(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  kind TEXT NOT NULL CHECK (kind IN ('original', 'detail', 'thumbnail')),
  storage_key TEXT NOT NULL UNIQUE,
  public_url TEXT,
  mime_type TEXT NOT NULL CHECK (length(trim(mime_type)) > 0),
  file_extension TEXT NOT NULL CHECK (length(trim(file_extension)) > 0),
  width INTEGER,
  height INTEGER,
  byte_size INTEGER NOT NULL CHECK (byte_size > 0),
  checksum_sha256 TEXT NOT NULL CHECK (length(checksum_sha256) = 64),
  state TEXT NOT NULL DEFAULT 'pending' CHECK (state IN ('pending', 'ready', 'superseded', 'deleted')),
  is_current INTEGER NOT NULL DEFAULT 0 CHECK (is_current IN (0, 1)),
  retention_until TEXT,
  created_at TEXT NOT NULL,
  superseded_at TEXT,
  deleted_at TEXT,
  CHECK ((width IS NULL AND height IS NULL) OR (width > 0 AND height > 0)),
  CHECK (kind = 'original' OR (width IS NOT NULL AND height IS NOT NULL)),
  CHECK (kind = 'original' OR public_url IS NOT NULL),
  CHECK (kind != 'original' OR public_url IS NULL)
);

CREATE TABLE publication_versions (
  id TEXT PRIMARY KEY NOT NULL,
  catalog_key TEXT NOT NULL UNIQUE,
  catalog_hash TEXT NOT NULL CHECK (length(catalog_hash) = 64),
  status TEXT NOT NULL DEFAULT 'generated' CHECK (status IN ('generated', 'deploying', 'live', 'superseded', 'failed')),
  deployment_id TEXT,
  created_at TEXT NOT NULL,
  deployment_started_at TEXT,
  deployed_at TEXT,
  superseded_at TEXT,
  retention_until TEXT,
  rollback_protected INTEGER NOT NULL DEFAULT 0 CHECK (rollback_protected IN (0, 1)),
  created_by TEXT NOT NULL,
  CHECK (status != 'deploying' OR deployment_id IS NOT NULL),
  CHECK (status != 'live' OR (deployment_id IS NOT NULL AND deployed_at IS NOT NULL))
);

CREATE TABLE publication_version_assets (
  publication_version_id TEXT NOT NULL REFERENCES publication_versions(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  photo_asset_id TEXT NOT NULL REFERENCES photo_assets(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  created_at TEXT NOT NULL,
  PRIMARY KEY (publication_version_id, photo_asset_id)
);

CREATE TABLE photo_slug_aliases (
  photo_id TEXT NOT NULL REFERENCES photos(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  slug TEXT NOT NULL UNIQUE CHECK (length(trim(slug)) > 0),
  created_at TEXT NOT NULL,
  retired_at TEXT,
  PRIMARY KEY (photo_id, slug)
);

CREATE TABLE gallery_slug_aliases (
  gallery_id TEXT NOT NULL REFERENCES galleries(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  slug TEXT NOT NULL UNIQUE CHECK (length(trim(slug)) > 0),
  created_at TEXT NOT NULL,
  retired_at TEXT,
  PRIMARY KEY (gallery_id, slug)
);

CREATE INDEX categories_status_sort_order_idx ON categories (status, sort_order);
CREATE INDEX galleries_status_sort_order_idx ON galleries (status, sort_order);
CREATE INDEX galleries_category_id_idx ON galleries (category_id);
CREATE INDEX photos_status_published_at_idx ON photos (status, published_at);
CREATE INDEX photos_category_id_idx ON photos (category_id);
CREATE INDEX photo_galleries_gallery_sort_order_idx ON photo_galleries (gallery_id, sort_order, photo_id);
CREATE INDEX photo_galleries_photo_id_idx ON photo_galleries (photo_id);
CREATE INDEX photo_assets_photo_kind_idx ON photo_assets (photo_id, kind);
CREATE INDEX photo_assets_state_retention_idx ON photo_assets (state, retention_until);
CREATE INDEX photo_assets_checksum_idx ON photo_assets (checksum_sha256);
CREATE INDEX publication_versions_status_created_at_idx ON publication_versions (status, created_at DESC);
CREATE INDEX publication_versions_retention_idx ON publication_versions (retention_until);
CREATE INDEX publication_version_assets_asset_id_idx ON publication_version_assets (photo_asset_id);
CREATE INDEX photo_slug_aliases_photo_id_idx ON photo_slug_aliases (photo_id);
CREATE INDEX gallery_slug_aliases_gallery_id_idx ON gallery_slug_aliases (gallery_id);

CREATE UNIQUE INDEX photo_assets_one_current_kind_idx
  ON photo_assets (photo_id, kind)
  WHERE is_current = 1 AND state != 'deleted';

CREATE UNIQUE INDEX publication_versions_one_live_idx
  ON publication_versions (status)
  WHERE status = 'live';

CREATE TRIGGER photos_slug_cannot_match_alias_insert
BEFORE INSERT ON photos
WHEN EXISTS (SELECT 1 FROM photo_slug_aliases WHERE slug = NEW.slug)
BEGIN
  SELECT RAISE(ABORT, 'photo slug conflicts with a historical alias');
END;

CREATE TRIGGER photos_slug_cannot_match_alias_update
BEFORE UPDATE OF slug ON photos
WHEN EXISTS (SELECT 1 FROM photo_slug_aliases WHERE slug = NEW.slug)
BEGIN
  SELECT RAISE(ABORT, 'photo slug conflicts with a historical alias');
END;

CREATE TRIGGER photo_alias_cannot_match_slug
BEFORE INSERT ON photo_slug_aliases
WHEN EXISTS (SELECT 1 FROM photos WHERE slug = NEW.slug)
BEGIN
  SELECT RAISE(ABORT, 'photo alias conflicts with a current slug');
END;

CREATE TRIGGER galleries_slug_cannot_match_alias_insert
BEFORE INSERT ON galleries
WHEN EXISTS (SELECT 1 FROM gallery_slug_aliases WHERE slug = NEW.slug)
BEGIN
  SELECT RAISE(ABORT, 'gallery slug conflicts with a historical alias');
END;

CREATE TRIGGER galleries_slug_cannot_match_alias_update
BEFORE UPDATE OF slug ON galleries
WHEN EXISTS (SELECT 1 FROM gallery_slug_aliases WHERE slug = NEW.slug)
BEGIN
  SELECT RAISE(ABORT, 'gallery slug conflicts with a historical alias');
END;

CREATE TRIGGER gallery_alias_cannot_match_slug
BEFORE INSERT ON gallery_slug_aliases
WHEN EXISTS (SELECT 1 FROM galleries WHERE slug = NEW.slug)
BEGIN
  SELECT RAISE(ABORT, 'gallery alias conflicts with a current slug');
END;

CREATE TRIGGER gallery_cover_must_be_member_insert
BEFORE INSERT ON galleries
WHEN NEW.cover_photo_id IS NOT NULL
BEGIN
  SELECT RAISE(ABORT, 'gallery cover photo must belong to the gallery');
END;

CREATE TRIGGER gallery_cover_must_be_member_update
BEFORE UPDATE OF cover_photo_id ON galleries
WHEN NEW.cover_photo_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM photo_galleries
    WHERE gallery_id = NEW.id AND photo_id = NEW.cover_photo_id
  )
BEGIN
  SELECT RAISE(ABORT, 'gallery cover photo must belong to the gallery');
END;

CREATE TRIGGER gallery_cover_membership_cannot_be_removed
BEFORE DELETE ON photo_galleries
WHEN EXISTS (
  SELECT 1 FROM galleries
  WHERE id = OLD.gallery_id AND cover_photo_id = OLD.photo_id
)
BEGIN
  SELECT RAISE(ABORT, 'cannot remove a gallery cover photo relationship');
END;

CREATE TRIGGER published_gallery_cover_cannot_be_archived
BEFORE UPDATE OF status ON photos
WHEN NEW.status = 'archived'
  AND EXISTS (
    SELECT 1 FROM galleries
    WHERE cover_photo_id = OLD.id AND status = 'published'
  )
BEGIN
  SELECT RAISE(ABORT, 'cannot archive a published gallery cover photo');
END;

CREATE TRIGGER archived_category_cannot_be_assigned_to_photo_insert
BEFORE INSERT ON photos
WHEN EXISTS (SELECT 1 FROM categories WHERE id = NEW.category_id AND status = 'archived')
BEGIN
  SELECT RAISE(ABORT, 'cannot assign an archived category to a photo');
END;

CREATE TRIGGER archived_category_cannot_be_assigned_to_photo_update
BEFORE UPDATE OF category_id ON photos
WHEN EXISTS (SELECT 1 FROM categories WHERE id = NEW.category_id AND status = 'archived')
BEGIN
  SELECT RAISE(ABORT, 'cannot assign an archived category to a photo');
END;

CREATE TRIGGER archived_category_cannot_be_assigned_to_gallery_insert
BEFORE INSERT ON galleries
WHEN NEW.category_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM categories WHERE id = NEW.category_id AND status = 'archived')
BEGIN
  SELECT RAISE(ABORT, 'cannot assign an archived category to a gallery');
END;

CREATE TRIGGER archived_category_cannot_be_assigned_to_gallery_update
BEFORE UPDATE OF category_id ON galleries
WHEN NEW.category_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM categories WHERE id = NEW.category_id AND status = 'archived')
BEGIN
  SELECT RAISE(ABORT, 'cannot assign an archived category to a gallery');
END;