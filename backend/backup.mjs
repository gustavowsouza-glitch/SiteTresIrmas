import { DatabaseSync } from 'node:sqlite';
import { mkdir, cp } from 'node:fs/promises';
import { join } from 'node:path';
const directory = process.env.DATA_DIR || '/data';
const target = join(directory, 'backups', new Date().toISOString().replace(/[:.]/g, '-'));
await mkdir(target, { recursive: true });
const db = new DatabaseSync(join(directory, 'store.sqlite'));
try { db.prepare('VACUUM INTO ?').run(join(target, 'store.sqlite')); } finally { db.close(); }
await cp(join(directory, 'uploads'), join(target, 'uploads'), { recursive: true });
console.log(`Backup criado em ${target}`);
