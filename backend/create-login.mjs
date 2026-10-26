import { openDatabase, hashPassword } from './database.mjs';
let input = '';
for await (const chunk of process.stdin) { input += chunk; if (input.length > 8192) throw new Error('Entrada inválida'); }
const { login, password } = JSON.parse(input);
if (typeof login !== 'string' || !/^[a-z0-9._-]{3,64}$/.test(login) || typeof password !== 'string' || password.length < 4 || password.length > 1024)
  throw new Error('Informe usuário com 3 a 64 caracteres e senha com ao menos 4 caracteres.');
const db = openDatabase(process.env.DATA_DIR || '/data');
try {
  if (db.prepare('SELECT 1 FROM admin_logins WHERE login=?').get(login)) throw new Error('Usuário já existe. Nenhuma conta foi alterada.');
  db.prepare('INSERT INTO admin_logins VALUES (?, ?)').run(login, await hashPassword(password));
  console.log('Acesso adicional criado. Contas existentes preservadas; senha armazenada como hash.');
} finally { db.close(); }
