import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { createStore } from './server.mjs';
import { hashPassword } from './database.mjs';
import { approvalMailer } from './approval-mail.mjs';

test('cadastro pendente, e-mail, decisão exclusiva do proprietário, expiração e nenhuma conta ao negar', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'access-test-'));
  const mails = []; const owner = 'owner@example.test';
  let failMail = false;
  const app = await createStore({ directory, approvalEmail: owner, notifyAccess: async mail => { if (failMail) throw Error('offline'); mails.push(mail); } });
  app.server.listen(0, '127.0.0.1'); await once(app.server, 'listening');
  const base = `http://127.0.0.1:${app.server.address().port}/api`;
  let address = 0;
  const request = (path, method = 'GET', data, cookie, extra = {}) => fetch(base + path, { method, headers: { 'Content-Type': 'application/json', 'X-Real-IP': `test-${address}`, ...(cookie ? { Cookie: cookie } : {}), ...extra }, ...(data === undefined ? {} : { body: JSON.stringify(data) }) });
  const login = async (email, password) => request('/auth/login', 'POST', { email, password });
  const candidate = email => ({ name: 'ADM de teste', email, password: 'Temporary-Password-123', isOwner: true });
  try {
    app.db.prepare('INSERT INTO admins VALUES (1, ?, ?)').run(owner, await hashPassword('Temporary-Owner-123'));
    app.db.prepare('INSERT INTO admin_logins VALUES (?, ?)').run('existing', await hashPassword('Temporary-Existing-123'));
    const ownerResponse = await login(owner, 'Temporary-Owner-123');
    assert.equal((await ownerResponse.clone().json()).isOwner, true);
    const ownerCookie = ownerResponse.headers.get('set-cookie').split(';')[0];
    const adminResponse = await login('existing', 'Temporary-Existing-123');
    assert.equal((await adminResponse.clone().json()).isOwner, false);
    const adminCookie = adminResponse.headers.get('set-cookie').split(';')[0];
    assert.equal((await request('/owner/access-requests')).status, 401);
    assert.equal((await request('/owner/access-requests', 'GET', undefined, adminCookie)).status, 403);
    assert.equal((await (await request('/auth/access-options')).json()).enabled, true);
    assert.equal((await request('/auth/access-requests', 'POST', candidate('new@example.test'))).status, 202);
    assert.equal(mails.length, 1); assert.equal(mails[0].to, owner);
    assert.equal(JSON.stringify(mails).includes('Temporary-Password'), false);
    const pending = (await (await request('/owner/access-requests', 'GET', undefined, ownerCookie)).json())[0];
    assert.equal(Object.hasOwn(pending, 'password_hash'), false);
    assert.equal((await login('new@example.test', 'Temporary-Password-123')).status, 401);
    const decisionPath = `/owner/access-requests/${pending.id}`;
    assert.equal((await request(decisionPath, 'GET', undefined, ownerCookie)).status, 405);
    assert.equal((await request(decisionPath, 'POST', { decision: 'approve' }, adminCookie)).status, 403);
    assert.equal((await request(decisionPath, 'POST', { decision: 'approve' }, ownerCookie, { Origin: 'https://outside.test' })).status, 403);
    assert.equal((await request('/auth/access-requests', 'POST', candidate('new@example.test'))).status, 409);
    assert.equal((await request(decisionPath, 'POST', { decision: 'approve' }, ownerCookie)).status, 200);
    assert.equal((await request(decisionPath, 'POST', { decision: 'approve' }, ownerCookie)).status, 409);
    const approved = await login('new@example.test', 'Temporary-Password-123');
    assert.equal(app.db.prepare('SELECT name FROM admin_profiles WHERE login=?').get('new@example.test').name, 'ADM de teste');
    assert.equal(approved.status, 200); assert.equal((await approved.clone().json()).isOwner, false);
    const approvedCookie = approved.headers.get('set-cookie').split(';')[0];
    assert.equal((await request('/management/products', 'GET', undefined, approvedCookie)).status, 200);
    assert.equal((await request('/owner/access-requests', 'GET', undefined, approvedCookie)).status, 403);
    address++;
    for (const email of ['denied@example.test', 'expired@example.test', 'failure@example.test']) {
      const response = await request('/auth/access-requests', 'POST', candidate(email)); assert.equal(response.status, 202);
    }
    const rows = await (await request('/owner/access-requests', 'GET', undefined, ownerCookie)).json();
    const denied = rows.find(row => row.email === 'denied@example.test');
    assert.equal((await request(`/owner/access-requests/${denied.id}`, 'POST', { decision: 'deny' }, ownerCookie)).status, 200);
    assert.equal(app.db.prepare('SELECT 1 FROM admin_logins WHERE login=?').get(denied.email), undefined);
    assert.equal(app.db.prepare('SELECT 1 FROM access_requests WHERE id=?').get(denied.id), undefined);
    const expired = rows.find(row => row.email === 'expired@example.test');
    app.db.prepare('UPDATE access_requests SET expires_at=0 WHERE id=?').run(expired.id);
    assert.equal((await request(`/owner/access-requests/${expired.id}`, 'POST', { decision: 'approve' }, ownerCookie)).status, 409);
    assert.equal(app.db.prepare('SELECT 1 FROM admin_logins WHERE login=?').get(expired.email), undefined);
    failMail = true;
    assert.equal((await request('/auth/access-requests', 'POST', candidate('mail-failed@example.test'))).status, 502);
    assert.equal(app.db.prepare('SELECT 1 FROM access_requests WHERE email=?').get('mail-failed@example.test'), undefined);
    assert.equal((await request('/auth/access-requests', 'POST', candidate('mail-failed2@example.test'))).status, 502);
    assert.equal((await request('/auth/access-requests', 'POST', candidate('short@example.test'))).status, 429);
    address++;
    assert.equal((await request('/auth/access-requests', 'POST', { ...candidate('short@example.test'), password: 'short' })).status, 400);
    assert.equal(app.db.prepare('SELECT count(*) AS n FROM admins').get().n, 1);
  } finally { await new Promise(resolve => app.server.close(resolve)); app.db.close(); await rm(directory, { recursive: true, force: true }); }
});

test('envio não configurado bloqueia cadastro sem criar pendência ou acesso', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'access-off-'));
  const app = await createStore({ directory, notifyAccess: null });
  app.server.listen(0, '127.0.0.1'); await once(app.server, 'listening');
  try {
    const response = await fetch(`http://127.0.0.1:${app.server.address().port}/api/auth/access-requests`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Teste', email: 'test@example.test', password: 'Temporary-Password-123' }) });
    assert.equal(response.status, 503);
    assert.equal(app.db.prepare('SELECT count(*) AS n FROM access_requests').get().n, 0);
  } finally { await new Promise(resolve => app.server.close(resolve)); app.db.close(); await rm(directory, { recursive: true, force: true }); }
});

test('e-mail usa destinatário configurado, escapa HTML e não decide por GET', async () => {
  let payload, options;
  const send = approvalMailer({ key: 'test-key', from: 'test@example.test', fetcher: async (url, input) => { options = input; payload = JSON.parse(input.body); return { ok: true }; } });
  await send({ to: 'owner@example.test', name: '<script>nome</script>', email: 'test@example.test', reviewUrl: 'https://example.test/autorizacoes/#solicitacao=test', requestId: 'test-id' });
  assert.deepEqual(payload.to, ['owner@example.test']);
  assert.equal(payload.html.includes('<script>'), false);
  assert.match(payload.html, /&lt;script&gt;/);
  assert.match(payload.html, /acao=approve/); assert.match(payload.html, /acao=deny/);
  assert.equal(options.headers['Idempotency-Key'], 'access-test-id');
  assert.equal(approvalMailer({ key: '', from: '' }), null);
});

test('modo local usa a caixa de solicitações sem e-mail e preserva autorização exclusiva', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'access-local-'));
  const owner = 'owner@example.test'; let notified = false;
  const app = await createStore({ directory, approvalEmail: owner, accessMode: 'local', notifyAccess: async () => { notified = true; throw Error('Não deve enviar'); } });
  app.server.listen(0, '127.0.0.1'); await once(app.server, 'listening');
  const base = `http://127.0.0.1:${app.server.address().port}/api`;
  const request = (path, method = 'GET', body, cookie) => fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  try {
    app.db.prepare('INSERT INTO admins VALUES (1, ?, ?)').run(owner, await hashPassword('Temporary-Owner-123'));
    app.db.prepare('INSERT INTO admin_logins VALUES (?, ?)').run('other', await hashPassword('Temporary-Other-123'));
    assert.deepEqual(await (await request('/auth/access-options')).json(), { enabled: true, delivery: 'local' });
    const submitted = await request('/auth/access-requests', 'POST', { name: 'Teste local', email: 'local@example.test', password: 'Temporary-Local-123' });
    assert.equal(submitted.status, 202);
    assert.match((await submitted.json()).message, /Nenhum e-mail real foi enviado/);
    assert.equal(notified, false);
    assert.equal((await request('/auth/login', 'POST', { email: 'local@example.test', password: 'Temporary-Local-123' })).status, 401);
    assert.equal((await request('/owner/access-requests')).status, 401);
    const other = await request('/auth/login', 'POST', { email: 'other', password: 'Temporary-Other-123' });
    assert.equal((await request('/owner/access-requests', 'GET', undefined, other.headers.get('set-cookie').split(';')[0])).status, 403);
    const signedIn = await request('/auth/login', 'POST', { email: owner, password: 'Temporary-Owner-123' });
    const cookie = signedIn.headers.get('set-cookie').split(';')[0];
    const pending = await (await request('/owner/access-requests', 'GET', undefined, cookie)).json();
    assert.equal(pending.length, 1); assert.equal(pending[0].name, 'Teste local');
    assert.equal((await request(`/owner/access-requests/${pending[0].id}`, 'POST', { decision: 'approve' }, cookie)).status, 200);
    const approved = await request('/auth/login', 'POST', { email: 'local@example.test', password: 'Temporary-Local-123' });
    assert.equal(approved.status, 200); assert.equal((await approved.json()).isOwner, false);
  } finally { await new Promise(resolve => app.server.close(resolve)); app.db.close(); await rm(directory, { recursive: true, force: true }); }
});

test('modo local é recusado para uma origem pública', async () => {
  await assert.rejects(createStore({ origin: 'https://example.test', accessMode: 'local' }), /localhost/);
});
