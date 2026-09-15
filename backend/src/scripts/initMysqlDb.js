import { pool, pingDb } from '../config/db.js';

console.log('[DB_INIT_SCRIPT] Initializing MySQL database tables & demo data...');

try {
  await pingDb();
  console.log('[DB_INIT_SCRIPT] MySQL database initialization finished successfully.');
} catch (error) {
  console.error('[DB_INIT_SCRIPT_ERROR] Initialization failed:', error.message || error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
