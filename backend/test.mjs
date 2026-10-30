import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { request as httpRequest } from 'node:http';
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
  const product = { name: 'Produto de teste', description: 'Descrição', category: 'Outros', price: 12.35, active: false, image_path: null };
  const json = value => ({ 'Content-Type': 'application/json', ...value });
  for (const input of [null, [], 'texto']) {
    assert.equal((await request('/auth/login', { method: 'POST', headers: json(), body: JSON.stringify(input) })).status, 400);
    assert.equal((await request('/cart/quote', { method: 'POST', headers: json(), body: JSON.stringify(input) })).status, 400);
  }
  assert.equal((await (await request('/products')).json()).length, 3);
  for (const [path, method] of [['/admin/products','GET'],['/admin/products','POST'],['/admin/products/52748a7e-7569-4311-9087-c379bec01745','PATCH'],['/admin/products/52748a7e-7569-4311-9087-c379bec01745','DELETE'],['/uploads','POST']]) assert.equal((await request(path, { method })).status, 401);
  const badLogin = await request('/auth/login', { method: 'POST', headers: json(), body: JSON.stringify({ email: 'owner@example.test', password: 'incorrect' }) });
  assert.equal(badLogin.status, 401);
  const login = await request('/auth/login', { method: 'POST', headers: json(), body: JSON.stringify({ email: 'owner@example.test', password: 'Test-Owner-Secret-2026' }) });
  assert.equal(login.status, 200);
  const cookie = login.headers.get('set-cookie');
  assert.match(cookie, /HttpOnly/); assert.match(cookie, /SameSite=Strict/);
  const headers = json({ Cookie: cookie.split(';')[0] });
  const directoryPhoto = '11111111-1111-4111-8111-111111111111.png';
  await mkdir(join(directory, 'uploads', directoryPhoto));
  assert.equal((await request('/admin/products', { method: 'POST', headers, body: JSON.stringify({ ...product, image_path: directoryPhoto }) })).status, 400);
  const temporary = await (await request('/admin/products', { method: 'POST', headers, body: JSON.stringify(product) })).json();
  const slowBody = JSON.stringify({ ...product, name: 'Edição em andamento' });
  const received = once(app.server, 'request');
  const slowEdit = httpRequest(`${base}/admin/products/${temporary.id}`, { method: 'PATCH', headers: { ...headers, 'Content-Length': Buffer.byteLength(slowBody) } });
  const slowResponse = once(slowEdit, 'response');
  slowEdit.write(slowBody.slice(0, 5));
  await received;
  assert.equal((await request(`/admin/products/${temporary.id}`, { method: 'DELETE', headers })).status, 200);
  slowEdit.end(slowBody.slice(5));
  const [deletedResponse] = await slowResponse;
  assert.equal(deletedResponse.statusCode, 404);
  for await (const chunk of deletedResponse) { /* Drain the test response. */ }
  assert.equal((await request('/auth/session', { headers })).status, 200);
  // Additional usernames coexist with the owner and use separate sessions.
  const ownerBefore = app.db.prepare('SELECT * FROM admins WHERE id=1').get();
  app.db.prepare('INSERT INTO admin_logins VALUES (?, ?)').run('testuser', await hashPassword('1234'));
  const userLogin = await request('/auth/login', { method: 'POST', headers: json(), body: JSON.stringify({ email: 'TestUser', password: '1234' }) });
  assert.equal(userLogin.status,200);
  const userHeaders = json({ Cookie: userLogin.headers.get('set-cookie').split(';')[0] });
  assert.equal((await (await request('/auth/session',{headers:userHeaders})).json()).login,'testuser');
  assert.equal((await request('/management/products',{headers:userHeaders})).status,200);
  assert.deepEqual(app.db.prepare('SELECT * FROM admins WHERE id=1').get(),ownerBefore);
  const invalidUser = await request('/auth/login',{method:'POST',headers:json(),body:JSON.stringify({email:'testuser',password:'wrong'})});
  assert.equal(invalidUser.status,401);
  await request('/auth/logout',{method:'POST',headers:userHeaders});
  assert.equal((await request('/auth/session',{headers:userHeaders})).status,401);
  assert.equal((await request('/auth/session',{headers})).status,200);

  assert.equal((await request('/admin/products', { method: 'POST', headers: { ...headers, Origin: 'https://outside.test' }, body: JSON.stringify(product) })).status, 403);
  assert.equal((await request('/admin/products', { method: 'POST', headers, body: JSON.stringify({ ...product, price: -1 }) })).status, 400);
  const created = await request('/admin/products', { method: 'POST', headers, body: JSON.stringify(product) });
  assert.equal(created.status, 201);
  const record = await created.json();
  assert.equal(record.price, 12.35);
  assert.equal(record.category, 'Outros');
  assert.equal((await request(`/products/${record.id}`)).status, 404);
  const quote = items => request('/cart/quote', { method: 'POST', headers: json(), body: JSON.stringify({ items }) });
  assert.equal((await quote([{ id: record.id, quantity: 1, personalization: '' }])).status, 409);
  assert.equal((await (await request('/products')).json()).some(row => row.id === record.id), false);
  assert.equal((await request('/uploads', { method: 'POST', headers: { Cookie: headers.Cookie }, body: '<svg>unsafe</svg>' })).status, 415);
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
  const uploaded = await request('/uploads', { method: 'POST', headers: { Cookie: headers.Cookie, 'Content-Type': 'image/png' }, body: png });
  assert.equal(uploaded.status, 201);
  const photo = await uploaded.json();
  const patch = await request(`/admin/products/${record.id}`, { method: 'PATCH', headers, body: JSON.stringify({ ...product, active: true, image_path: photo.image_path }) });
  assert.equal(patch.status, 200);
  assert.equal((await request(`/products/${record.id}`)).status, 200);
  assert.equal((await quote([{ id: record.id, quantity: 0, personalization: '' }])).status, 400);
  assert.equal((await quote([{ id: record.id, quantity: 1.5, personalization: '' }])).status, 400);
  assert.equal((await quote([{ id: record.id, quantity: 100, personalization: '' }])).status, 400);
  assert.equal((await quote([])).status, 400);
  const subtotal = await (await quote([{ id: record.id, quantity: 3, personalization: 'Nome especial', price: 0.01 }])).json();
  assert.equal(subtotal.subtotal, 37.05);
  assert.equal(subtotal.items[0].personalization, 'Nome especial');
  assert.equal(subtotal.items[0].price, 12.35);
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
  console.log('PASS: acesso do dono, visitantes, CSRF, CRUD, fotos, persistência, detalhes, quarta categoria, carrinho e preços calculados no servidor.');
} finally { if (app.server.listening) await stop(); await rm(directory, { recursive: true, force: true }); }
