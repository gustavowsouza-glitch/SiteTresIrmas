import { createHash } from 'node:crypto';

// Drafts are stored independently from the published catalog.
export function createCatalogDrafts(db, fail) {
  db.exec(`CREATE TABLE IF NOT EXISTS catalog_draft (
    id INTEGER PRIMARY KEY CHECK(id=1), products_json TEXT NOT NULL,
    base_hash TEXT NOT NULL, revision INTEGER NOT NULL);`);
  const live = () => db.prepare('SELECT * FROM products ORDER BY id').all();
  const hash = rows => createHash('sha256').update(JSON.stringify(rows)).digest('hex');
  const revision = () => Number(db.prepare("SELECT value FROM metadata WHERE key='catalog_revision'").get()?.value || 0);
  const nextRevision = () => {
    const next = revision() + 1;
    db.prepare("INSERT INTO metadata VALUES ('catalog_revision', ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(String(next));
    return next;
  };
  function state() {
    const published = live();
    const draft = db.prepare('SELECT * FROM catalog_draft WHERE id=1').get();
    return { rows: draft ? JSON.parse(draft.products_json) : published,
      revision: revision(), pending: !!draft,
      conflict: !!draft && draft.base_hash !== hash(published),
      baseHash: draft?.base_hash || hash(published) };
  }
  function check(expected, current) {
    if (!Number.isSafeInteger(expected) || expected !== current.revision)
      fail(409, 'Esta lista mudou em outra aba. Atualize a página antes de continuar.');
  }
  function write(expected, edit) {
    const current = state(); check(expected, current);
    const rows = edit(current.rows);
    if (rows.length > 2000) fail(400, 'O catálogo aceita até 2000 produtos.');
    db.exec('BEGIN IMMEDIATE');
    try {
      const next = nextRevision();
      db.prepare('INSERT INTO catalog_draft VALUES (1, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET products_json=excluded.products_json, base_hash=excluded.base_hash, revision=excluded.revision')
        .run(JSON.stringify(rows), current.baseHash, next);
      db.exec('COMMIT');
    } catch (error) { db.exec('ROLLBACK'); throw error; }
    return state();
  }
  function publish(expected, checkPhoto) {
    const current = state(); check(expected, current);
    if (!current.pending) fail(409, 'Não há rascunhos para publicar.');
    if (current.conflict) fail(409, 'A loja foi alterada fora desta central. Descarte os rascunhos e confira a versão atual antes de editar novamente.');
    current.rows.forEach(checkPhoto);
    db.exec('BEGIN IMMEDIATE');
    try {
      db.exec('DELETE FROM products');
      const insert = db.prepare('INSERT INTO products (id, name, description, category, price_cents, active, image_path, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
      for (const row of current.rows) insert.run(row.id, row.name, row.description, row.category, row.price_cents, row.active, row.image_path, row.created_at);
      db.exec('DELETE FROM catalog_draft'); nextRevision();
      db.exec('COMMIT');
    } catch (error) { db.exec('ROLLBACK'); throw error; }
    return state();
  }
  function discard(expected) {
    check(expected, state());
    db.exec('BEGIN IMMEDIATE');
    try { db.exec('DELETE FROM catalog_draft'); nextRevision(); db.exec('COMMIT'); }
    catch (error) { db.exec('ROLLBACK'); throw error; }
    return state();
  }
  return { state, write, publish, discard };
}

// Also used by cleanup and backup, including snapshots from older versions.
export function catalogImagePaths(db) {
  const paths = new Set(db.prepare('SELECT image_path FROM products WHERE image_path IS NOT NULL').all().map(row => row.image_path));
  if (db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='catalog_draft'").get()) {
    const draft = db.prepare('SELECT products_json FROM catalog_draft WHERE id=1').get();
    if (draft) for (const row of JSON.parse(draft.products_json)) if (row.image_path) paths.add(row.image_path);
  }
  return paths;
}