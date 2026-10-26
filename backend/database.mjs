import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const derive = promisify(scrypt);
export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = await derive(password, salt, 64);
  return `${salt}:${hash.toString('hex')}`;
}
export async function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const candidate = await derive(password, salt, 64);
  return timingSafeEqual(candidate, Buffer.from(hash, 'hex'));
}
export function openDatabase(directory) {
  mkdirSync(join(directory, 'uploads'), { recursive: true });
  const db = new DatabaseSync(join(directory, 'store.sqlite'));
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS admins (id INTEGER PRIMARY KEY CHECK(id=1), email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, expires_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', category TEXT NOT NULL, price_cents INTEGER NOT NULL CHECK(price_cents>=0), active INTEGER NOT NULL CHECK(active IN (0,1)), image_path TEXT, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);`);
  db.exec('CREATE TABLE IF NOT EXISTS admin_logins (login TEXT PRIMARY KEY, password_hash TEXT NOT NULL)');
  if (!db.prepare('PRAGMA table_info(sessions)').all().some(column => column.name === 'login'))
    db.exec('ALTER TABLE sessions ADD COLUMN login TEXT');
  if (!db.prepare("SELECT 1 FROM metadata WHERE key='seeded'").get()) {
    const seed = JSON.parse(readFileSync(new URL('./seed.json', import.meta.url), 'utf8'));
    db.exec('BEGIN');
    try {
      const insert = db.prepare('INSERT INTO products VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
      for (const product of seed) insert.run(product.id, product.name, product.description || '', product.category, Math.round(product.price * 100), product.active ? 1 : 0, null, product.created_at || new Date().toISOString());
      db.prepare("INSERT INTO metadata VALUES ('seeded', '1')").run();
      db.exec('COMMIT');
    } catch (error) { db.exec('ROLLBACK'); throw error; }
  }
  return db;
}
