import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { createStore } from './server.mjs';
import { hashPassword } from './database.mjs';

const directory = await mkdtemp(join(tmpdir(), 'store-test-'));
let app;
async function start() { app = await createStore({ directory }); app.server.listen(0, '127.0.0.1'); await once(app.server, 'listening'); return `http://127.0.0.1:${app.server.address().port}/api`; }
async function stop() { await new Promise(resolve => app.server.close(resolve)); app.db.close(); }
try {
  let base = await start();
  app.db.prepare('INSERT INTO admins VALUES (1, ?, ?)').run('owner@example.test', await hashPassword('Test-Owner-Secret-2026'));
  const request = (path, options = {}) => fetch(base + path, options);
  const product = { name: 'Produto de teste', description: 'Descrição', category: 'Canecas', price: 12.35, active: false, image_path: null };
  const json = value => ({ 'Content-Type': 'application/json', ...value });
  assert.equal((await (await request('/products')).json()).length, 3);
  for (const [path, method] of [['/admin/products','GET'],['/admin/products','POST'],['/admin/products/52748a7e-7569-4311-9087-c379bec01745','PATCH'],['/admin/products/52748a7e-7569-4311-9087-c379bec01745','DELETE'],['/uploads','POST']]) assert.equal((await request(path, { method })).status, 401);
  const badLogin = await request('/auth/login', { method: 'POST', headers: json(), body: JSON.stringify({ email: 'owner@example.test', password: 'incorrect' }) });
  assert.equal(badLogin.status, 401);
  const login = await request('/auth/login', { method: 'POST', headers: json(), body: JSON.stringify({ email: 'owner@example.test', password: 'Test-Owner-Secret-2026' }) });
  assert.equal(login.status, 200);
  const cookie = login.headers.get('set-cookie');
  assert.match(cookie, /HttpOnly/); assert.match(cookie, /SameSite=Strict/);
  const headers = json({ Cookie: cookie.split(';')[0] });
  assert.equal((await request('/auth/session', { headers })).status, 200);
  assert.equal((await request('/admin/products', { method: 'POST', headers: { ...headers, Origin: 'https://outside.test' }, body: JSON.stringify(product) })).status, 403);
  assert.equal((await request('/admin/products', { method: 'POST', headers, body: JSON.stringify({ ...product, price: -1 }) })).status, 400);
  const created = await request('/admin/products', { method: 'POST', headers, body: JSON.stringify(product) });
  assert.equal(created.status, 201);
  const record = await created.json();
  assert.equal(record.price, 12.35);
  assert.equal((await (await request('/products')).json()).some(row => row.id === record.id), false);
  assert.equal((await request('/uploads', { method: 'POST', headers: { Cookie: headers.Cookie }, body: '<svg>unsafe</svg>' })).status, 415);
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
  const uploaded = await request('/uploads', { method: 'POST', headers: { Cookie: headers.Cookie, 'Content-Type': 'image/png' }, body: png });
  assert.equal(uploaded.status, 201);
  const photo = await uploaded.json();
  const patch = await request(`/admin/products/${record.id}`, { method: 'PATCH', headers, body: JSON.stringify({ ...product, active: true, image_path: photo.image_path }) });
  assert.equal(patch.status, 200);
  const publicPhoto = await fetch(new URL(photo.imageUrl, base));
  assert.equal(publicPhoto.status, 200); assert.equal(publicPhoto.headers.get('content-type'), 'image/png');
  assert.equal((await (await request('/products')).json()).some(row => row.id === record.id), true);
  await stop(); base = await start();
  assert.equal((await (await request('/admin/products', { headers })).json()).length, 4);
  assert.equal((await fetch(new URL(photo.imageUrl, base))).status, 200);
  assert.equal((await request(`/admin/products/${record.id}`, { method: 'DELETE', headers })).status, 200);
  assert.equal((await request('/auth/logout', { method: 'POST', headers })).status, 200);
  assert.equal((await request('/auth/session', { headers })).status, 401);
  assert.equal((await (await request('/products')).json()).length, 3);
  console.log('PASS: acesso do dono, bloqueio de visitantes, CSRF, preços, CRUD, fotos, persistência e logout.');
} finally { if (app.server.listening) await stop(); await rm(directory, { recursive: true, force: true }); }
