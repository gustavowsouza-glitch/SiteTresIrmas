import { createServer } from 'node:http';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { readFile, writeFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { openDatabase, hashPassword, verifyPassword } from './database.mjs';

const categories = ['Canecas', 'Brindes', 'Brinquedos'];
const sha = value => createHash('sha256').update(value).digest('hex');
class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
const fail = (status, message) => { throw new HttpError(status, message); };
const rowToProduct = row => ({ id: row.id, name: row.name, description: row.description, category: row.category, price: row.price_cents / 100, active: !!row.active, image_path: row.image_path, imageUrl: row.image_path ? `/api/images/${row.image_path}` : null, created_at: row.created_at });

export async function createStore({ directory = process.env.DATA_DIR || '/data', origin = process.env.PUBLIC_ORIGIN || 'http://localhost:8080', secureCookie = process.env.COOKIE_SECURE === 'true' } = {}) {
  const db = openDatabase(directory);
  const dummyHash = await hashPassword(randomBytes(32).toString('hex'));
  const attempts = new Map();
  function sessionToken(request) { return /(?:^|;\s*)ic_session=([a-f0-9]{64})(?:;|$)/.exec(request.headers.cookie || '')?.[1]; }
  function authorized(request) {
    const token = sessionToken(request);
    return token && !!db.prepare('SELECT 1 FROM sessions WHERE token_hash=? AND expires_at>?').get(sha(token), Date.now());
  }
  function requireOwner(request) { if (!authorized(request)) fail(401, 'Entre com a conta do administrador.'); }
  function cookie(token, seconds) { return `ic_session=${token}; HttpOnly; SameSite=Strict; Path=/api; Max-Age=${seconds}${secureCookie ? '; Secure' : ''}`; }
  async function bytes(request, limit) {
    let size = 0; const chunks = [];
    if (Number(request.headers['content-length']) > limit) fail(413, 'Arquivo ou conteúdo muito grande.');
    for await (const chunk of request) { size += chunk.length; if (size > limit) fail(413, 'Arquivo ou conteúdo muito grande.'); chunks.push(chunk); }
    return Buffer.concat(chunks);
  }
  async function json(request) {
    if (!request.headers['content-type']?.startsWith('application/json')) fail(415, 'Envie conteúdo JSON.');
    try { return JSON.parse((await bytes(request, 20000)).toString('utf8')); }
    catch (error) { if (error instanceof HttpError) throw error; fail(400, 'Conteúdo inválido.'); }
  }
  function send(response, status, body, extra = {}) {
    response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...extra });
    response.end(JSON.stringify(body));
  }
  function validate(data) {
    if (!data || typeof data !== 'object' || typeof data.name !== 'string' || !data.name.trim() || data.name.length > 200) fail(400, 'Informe um nome válido.');
    if (typeof data.price !== 'number' || !Number.isFinite(data.price) || data.price < 0 || data.price > 1000000) fail(400, 'Informe um preço válido.');
    if (!categories.includes(data.category) || typeof data.active !== 'boolean') fail(400, 'Categoria ou visibilidade inválida.');
    if (typeof data.description !== 'string' || data.description.length > 5000) fail(400, 'Descrição inválida.');
    if (data.image_path !== null && (typeof data.image_path !== 'string' || !/^[a-f0-9-]{36}\.(png|jpg|webp|gif)$/.test(data.image_path))) fail(400, 'Foto inválida.');
    return { ...data, name: data.name.trim(), price_cents: Math.round(data.price * 100) };
  }
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url, 'http://internal');
      const path = url.pathname;
      const method = request.method;
      if (!['GET', 'HEAD'].includes(method)) {
        if (request.headers.origin && request.headers.origin !== origin) fail(403, 'Origem não permitida.');
        if (request.headers['sec-fetch-site'] === 'cross-site') fail(403, 'Origem não permitida.');
      }
      if (method === 'GET' && path === '/api/health') return send(response, 200, { ok: true });
      if (method === 'POST' && path === '/api/auth/login') {
        const address = request.headers['x-real-ip'] || request.socket.remoteAddress;
        const now = Date.now();
        for (const [key, value] of attempts) if (value.until < now) attempts.delete(key);
        const entry = attempts.get(address) || { count: 0, until: now + 15 * 60 * 1000 };
        if (entry.count >= 10) fail(429, 'Muitas tentativas. Aguarde 15 minutos e tente novamente.');
        entry.count++; attempts.set(address, entry);
        const data = await json(request);
        if (typeof data.email !== 'string' || typeof data.password !== 'string' || data.password.length > 1024) fail(400, 'Informe e-mail e senha.');
        const owner = db.prepare('SELECT * FROM admins WHERE id=1').get();
        const valid = await verifyPassword(data.password, owner?.password_hash || dummyHash);
        if (!owner || owner.email !== data.email.trim().toLowerCase() || !valid) fail(401, 'E-mail ou senha incorretos.');
        attempts.delete(address);
        const token = randomBytes(32).toString('hex');
        db.prepare('DELETE FROM sessions WHERE expires_at<=?').run(now);
        db.prepare('INSERT INTO sessions VALUES (?, ?)').run(sha(token), now + 8 * 60 * 60 * 1000);
        return send(response, 200, { email: owner.email, role: 'admin' }, { 'Set-Cookie': cookie(token, 28800) });
      }
      if (method === 'GET' && path === '/api/auth/session') {
        requireOwner(request);
        return send(response, 200, { email: db.prepare('SELECT email FROM admins WHERE id=1').get().email, role: 'admin' });
      }
      if (method === 'POST' && path === '/api/auth/logout') {
        const token = sessionToken(request);
        if (token) db.prepare('DELETE FROM sessions WHERE token_hash=?').run(sha(token));
        return send(response, 200, { ok: true }, { 'Set-Cookie': cookie('', 0) });
      }
      if (method === 'GET' && (path === '/api/products' || path === '/api/admin/products')) {
        if (path.includes('/admin/')) requireOwner(request);
        const rows = db.prepare(`SELECT * FROM products ${path.includes('/admin/') ? '' : 'WHERE active=1'} ORDER BY created_at, id`).all();
        return send(response, 200, rows.map(rowToProduct));
      }
      if (method === 'POST' && path === '/api/uploads') {
        requireOwner(request);
        const buffer = await bytes(request, 5 * 1024 * 1024);
        let extension;
        if (buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) extension = 'png';
        else if (buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255) extension = 'jpg';
        else if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') extension = 'webp';
        else if (['GIF87a', 'GIF89a'].includes(buffer.toString('ascii', 0, 6))) extension = 'gif';
        else fail(415, 'Escolha uma foto PNG, JPG, WebP ou GIF.');
        const filename = `${randomUUID()}.${extension}`;
        await writeFile(join(directory, 'uploads', filename), buffer, { flag: 'wx' });
        return send(response, 201, { image_path: filename, imageUrl: `/api/images/${filename}` });
      }
      const imageMatch = /^\/api\/images\/([a-f0-9-]{36}\.(png|jpg|webp|gif))$/.exec(path);
      if (method === 'GET' && imageMatch) {
        const buffer = await readFile(join(directory, 'uploads', imageMatch[1]));
        response.writeHead(200, { 'Content-Type': `image/${imageMatch[2] === 'jpg' ? 'jpeg' : imageMatch[2]}`, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'public, max-age=86400' });
        return response.end(buffer);
      }
      const productMatch = /^\/api\/admin\/products\/([a-f0-9-]{36})$/.exec(path);
      if ((method === 'POST' && path === '/api/admin/products') || (productMatch && ['PATCH', 'DELETE'].includes(method))) {
        requireOwner(request);
        const id = productMatch?.[1] || randomUUID();
        if (productMatch && !db.prepare('SELECT id FROM products WHERE id=?').get(id)) fail(404, 'Produto não encontrado.');
        if (method === 'DELETE') { db.prepare('DELETE FROM products WHERE id=?').run(id); return send(response, 200, { ok: true }); }
        const data = validate(await json(request));
        if (data.image_path) { try { await stat(join(directory, 'uploads', data.image_path)); } catch { fail(400, 'Envie a foto antes de salvar.'); } }
        if (method === 'POST') db.prepare('INSERT INTO products VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(id, data.name, data.description, data.category, data.price_cents, data.active ? 1 : 0, data.image_path, new Date().toISOString());
        else db.prepare('UPDATE products SET name=?, description=?, category=?, price_cents=?, active=?, image_path=? WHERE id=?').run(data.name, data.description, data.category, data.price_cents, data.active ? 1 : 0, data.image_path, id);
        return send(response, method === 'POST' ? 201 : 200, rowToProduct(db.prepare('SELECT * FROM products WHERE id=?').get(id)));
      }
      fail(404, 'Recurso não encontrado.');
    } catch (error) {
      const status = error.status || (error.code === 'ENOENT' ? 404 : 500);
      if (status === 500) console.error('Falha interna:', error.code || error.name);
      if (!response.headersSent) send(response, status, { error: status === 500 ? 'Não foi possível concluir a operação.' : error.message });
      else response.end();
    }
  });
  return { server, db };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { server } = await createStore();
  server.listen(Number(process.env.PORT || 3000), '0.0.0.0', () => console.log('API da loja iniciada.'));
}
