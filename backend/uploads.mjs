import { readdirSync, lstatSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

// Called synchronously so a product cannot acquire a reference between checking
// the database and removing a file. Never follow links or remove unknown files.
export function cleanUploads(db, directory, now = Date.now()) {
  db.exec('CREATE TABLE IF NOT EXISTS orphan_uploads (filename TEXT PRIMARY KEY, noticed_at INTEGER NOT NULL)');
  const referenced = new Set(db.prepare('SELECT image_path FROM products WHERE image_path IS NOT NULL').all().map(row => row.image_path));
  const files = readdirSync(join(directory, 'uploads'));
  const present = new Set(files);
  const forget = db.prepare('DELETE FROM orphan_uploads WHERE filename=?');
  for (const { filename } of db.prepare('SELECT filename FROM orphan_uploads').all()) {
    if (referenced.has(filename) || !present.has(filename)) forget.run(filename);
  }
  let removed = 0;
  for (const filename of files) {
    if (!/^[a-f0-9-]{36}\.(png|jpg|webp|gif)$/.test(filename) || referenced.has(filename)) continue;
    const path = join(directory, 'uploads', filename);
    if (!lstatSync(path).isFile()) continue;
    db.prepare('INSERT OR IGNORE INTO orphan_uploads VALUES (?, ?)').run(filename, now);
    const orphan = db.prepare('SELECT noticed_at FROM orphan_uploads WHERE filename=?').get(filename);
    if (now - orphan.noticed_at < 24 * 60 * 60 * 1000) continue;
    unlinkSync(path);
    forget.run(filename);
    removed++;
  }
  return removed;
}
