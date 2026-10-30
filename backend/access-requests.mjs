import { randomUUID } from 'node:crypto';
import { hashPassword } from './database.mjs';

const lifetime = 48 * 60 * 60 * 1000;
export function createAccessRequests(db, { fail, notify, ownerEmail, origin, local = false }) {
  db.exec(`CREATE TABLE IF NOT EXISTS access_requests (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
    password_hash TEXT, status TEXT NOT NULL, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL);`);
  db.exec('CREATE TABLE IF NOT EXISTS admin_profiles (login TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL, created_at INTEGER NOT NULL)');
  const exists = email => db.prepare('SELECT 1 FROM admins WHERE email=?').get(email) || db.prepare('SELECT 1 FROM admin_logins WHERE login=?').get(email);
  function configured() {
    return !!notify && db.prepare('SELECT email FROM admins WHERE id=1').get()?.email === ownerEmail;
  }
  function cleanup() {
    db.prepare('DELETE FROM access_requests WHERE expires_at<=?').run(Date.now());
  }
  async function submit(data) {
    if (!configured()) fail(503, 'As solicitações de acesso aguardam a configuração do envio de e-mails pelo proprietário.');
    if (typeof data.name !== 'string' || !data.name.trim() || data.name.length > 100 || typeof data.email !== 'string' || data.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim()) || typeof data.password !== 'string' || data.password.length < 12 || data.password.length > 128) fail(400, 'Informe nome, e-mail válido e senha de 12 a 128 caracteres.');
    cleanup();
    const email = data.email.trim().toLowerCase();
    const unavailable = () => exists(email) || db.prepare('SELECT 1 FROM access_requests WHERE email=?').get(email);
    if (unavailable()) fail(409, 'Já existe um acesso ou uma solicitação para esse e-mail.');
    if (db.prepare('SELECT count(*) AS n FROM access_requests').get().n >= 1000) fail(429, 'Há muitas solicitações. Tente novamente mais tarde.');
    const passwordHash = await hashPassword(data.password);
    if (unavailable()) fail(409, 'Já existe um acesso ou uma solicitação para esse e-mail.');
    const id = randomUUID(), now = Date.now();
    db.prepare('INSERT INTO access_requests VALUES (?, ?, ?, ?, ?, ?, ?)').run(id, data.name.trim(), email, passwordHash, 'pending', now, now + lifetime);
    try {
      await notify({ to: ownerEmail, name: data.name.trim(), email, requestId: id,
        reviewUrl: `${origin}/autorizacoes/#solicitacao=${encodeURIComponent(id)}` });
    } catch {
      db.prepare("DELETE FROM access_requests WHERE id=? AND status='pending'").run(id);
      fail(502, 'Não foi possível enviar o aviso ao proprietário. Nenhum acesso foi liberado. Tente novamente mais tarde.');
    }
    return { message: local
      ? 'Modo de teste: solicitação registrada na caixa local do proprietário. Nenhum e-mail real foi enviado. Aguarde a autorização para entrar. Prazo: 48 horas.'
      : 'Solicitação enviada ao proprietário. Aguarde a autorização para entrar. Ela expira em 48 horas.' };
  }
  function list() {
    cleanup();
    return db.prepare("SELECT id,name,email,created_at,expires_at FROM access_requests WHERE status='pending' ORDER BY created_at").all();
  }
  function decide(id, decision) {
    if (!['approve', 'deny'].includes(decision)) fail(400, 'Escolha Permitir ou Negar.');
    db.exec('BEGIN IMMEDIATE');
    try {
      const row = db.prepare('SELECT * FROM access_requests WHERE id=?').get(id);
      if (!row || row.status !== 'pending' || row.expires_at <= Date.now()) fail(409, 'A solicitação expirou ou já foi respondida.');
      if (decision === 'approve') {
        if (exists(row.email)) fail(409, 'Já existe um acesso para esse e-mail.');
        db.prepare('INSERT INTO admin_logins (login,password_hash) VALUES (?,?)').run(row.email, row.password_hash);
        db.prepare('INSERT INTO admin_profiles VALUES (?,?,?,?)').run(row.email, row.name, row.email, Date.now());
      }
      // A denied request never creates an account. Remove the pending hash too.
      db.prepare('DELETE FROM access_requests WHERE id=?').run(id);
      db.exec('COMMIT');
      return { message: decision === 'approve' ? 'Acesso autorizado. A pessoa já pode entrar com o e-mail e a senha solicitados.' : 'Solicitação negada. Nenhuma conta foi criada.' };
    } catch (error) { db.exec('ROLLBACK'); throw error; }
  }
  return { configured, submit, list, decide, cleanup };
}
