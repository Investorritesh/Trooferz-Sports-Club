import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, '../../trooferz.db');
const db = new DatabaseSync(dbPath);

db.exec(`UPDATE sports SET image_url='https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&w=1200&q=80' WHERE id=1 OR name='Football';`);
db.exec(`UPDATE facilities SET image_url='https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1200&q=80' WHERE id=1 OR name LIKE '%Arena 1%';`);
db.exec(`UPDATE facilities SET image_url='https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&w=1200&q=80' WHERE id=2 OR name LIKE '%Arena 2%';`);

console.log('[DB] Late-night football and arena images updated successfully.');
