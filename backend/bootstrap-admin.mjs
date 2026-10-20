import { openDatabase, hashPassword } from './database.mjs';
let input = '';
for await (const chunk of process.stdin) { input += chunk; if (input.length > 8192) throw new Error('Entrada inválida'); }
const { email, password } = JSON.parse(input);
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '') || typeof password !== 'string' || password.length < 12) throw new Error('Informe e-mail válido e senha com ao menos 12 caracteres.');
const db = openDatabase(process.env.DATA_DIR || '/data');
try {
  if (db.prepare('SELECT id FROM admins').get()) throw new Error('Administrador já cadastrado. Nenhuma alteração realizada.');
  db.prepare('INSERT INTO admins VALUES (1, ?, ?)').run(email.trim().toLowerCase(), await hashPassword(password));
  console.log('Administrador cadastrado. Senha armazenada somente como hash.');
} finally { db.close(); }
