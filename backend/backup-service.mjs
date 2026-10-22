import { createBackup } from './backup.mjs';

async function run() {
  let delay = 24 * 60 * 60 * 1000;
  try { await createBackup(); }
  catch (error) {
    console.error('Backup falhou; nova tentativa em uma hora:', error.code || error.message);
    delay = 60 * 60 * 1000;
  }
  setTimeout(run, delay);
}
await run();
