import { DatabaseSync } from 'node:sqlite';
import { mkdir, copyFile, rename } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { catalogImagePaths } from './catalog-drafts.mjs';

export async function createBackup(directory = process.env.DATA_DIR || '/data', destination = process.env.BACKUP_DIR || join(directory, 'backups')) {
  const name = `${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID()}`;
  const target = join(destination, name);
  const staging = `${target}.partial`;
  await mkdir(join(staging, 'uploads'), { recursive: true });
  const db = new DatabaseSync(join(directory, 'store.sqlite'), { readOnly: true });
  try { db.prepare('VACUUM INTO ?').run(join(staging, 'store.sqlite')); } finally { db.close(); }
  const snapshot = new DatabaseSync(join(staging, 'store.sqlite'), { readOnly: true });
  try {
    const photos = Array.from(catalogImagePaths(snapshot), image_path => ({ image_path }));
    for (const { image_path: filename } of photos) {
      if (!/^[a-f0-9-]{36}\.(png|jpg|webp|gif)$/.test(filename)) throw new Error('Nome de foto inválido no backup.');
      await copyFile(join(directory, 'uploads', filename), join(staging, 'uploads', filename));
    }
    if (Object.values(snapshot.prepare('PRAGMA integrity_check').get())[0] !== 'ok') throw new Error('Falha na integridade do backup.');
  } finally { snapshot.close(); }
  // Incomplete copies never appear as a completed backup.
  await rename(staging, target);
  console.log(`Backup verificado em ${target}`);
  return resolve(target);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await createBackup();
