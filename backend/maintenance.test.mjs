import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { openDatabase } from './database.mjs';
import { cleanUploads } from './uploads.mjs';
import { createBackup } from './backup.mjs';

test('cleanup preserves references, shared/hidden photos and recent uploads; deletes only expired orphans', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'photos-test-'));
  const db = openDatabase(directory);
  try {
    const used = '11111111-1111-4111-8111-111111111111.png';
    const orphan = '22222222-2222-4222-8222-222222222222.png';
    const abandoned = '33333333-3333-4333-8333-333333333333.png';
    for (const name of [used, orphan, abandoned, 'unknown.txt']) await writeFile(join(directory, 'uploads', name), 'test');
    const rows = db.prepare('SELECT id FROM products').all();
    db.prepare('UPDATE products SET image_path=?, active=0 WHERE id=?').run(used, rows[0].id);
    db.prepare('UPDATE products SET image_path=? WHERE id=?').run(used, rows[1].id);
    assert.equal(cleanUploads(db, directory, 0), 0);
    // A pending upload becomes referenced before the retention period ends.
    db.prepare('UPDATE products SET image_path=? WHERE id=?').run(orphan, rows[2].id);
    assert.equal(cleanUploads(db, directory, 86400001), 1);
    assert.deepEqual((await readdir(join(directory, 'uploads'))).sort(), [used, orphan, 'unknown.txt'].sort());
    db.prepare('UPDATE products SET image_path=NULL WHERE image_path=?').run(used);
    assert.equal(cleanUploads(db, directory, 86400002), 0);
    assert.equal(cleanUploads(db, directory, 172800003), 1);
    assert.deepEqual((await readdir(join(directory, 'uploads'))).sort(), [orphan, 'unknown.txt'].sort());
  } finally { db.close(); await rm(directory, { recursive: true, force: true }); }
});

test('external backup contains a valid database and referenced photos; missing photos never produce a completed copy', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'backup-test-'));
  const destination = await mkdtemp(join(tmpdir(), 'backup-dest-'));
  const db = openDatabase(directory);
  try {
    const photo = '44444444-4444-4444-8444-444444444444.png';
    await writeFile(join(directory, 'uploads', photo), 'photo-data');
    db.prepare('UPDATE products SET image_path=?').run(photo);
    const target = await createBackup(directory, destination);
    const copy = new DatabaseSync(join(target, 'store.sqlite'), { readOnly: true });
    try { assert.equal(copy.prepare('SELECT count(*) AS n FROM products').get().n, 3); } finally { copy.close(); }
    assert.equal(await readFile(join(target, 'uploads', photo), 'utf8'), 'photo-data');
    db.prepare('UPDATE products SET image_path=?').run('55555555-5555-4555-8555-555555555555.png');
    await assert.rejects(createBackup(directory, destination), { code: 'ENOENT' });
    assert.equal((await readdir(destination)).filter(name => !name.endsWith('.partial')).length, 1);
  } finally { db.close(); await rm(directory, { recursive: true, force: true }); await rm(destination, { recursive: true, force: true }); }
});
