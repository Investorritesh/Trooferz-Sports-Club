import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, '../../trooferz.db');

const db = new DatabaseSync(dbPath);

db.prepare("UPDATE facilities SET image_url='/football-court.jpg' WHERE name LIKE '%Arena 1%' OR name LIKE '%Football%'").run();
db.prepare("UPDATE facilities SET image_url='/pickleball-court.jpg' WHERE name LIKE '%Court 3%' OR name LIKE '%Pickleball%'").run();
db.prepare("UPDATE sports SET image_url='/football-court.jpg' WHERE name='Football'").run();
db.prepare("UPDATE sports SET image_url='/pickleball-court.jpg' WHERE name='Pickleball'").run();

console.log('[DB FIX] Facilities updated:');
console.log(db.prepare('SELECT id, name, image_url FROM facilities').all());
console.log('[DB FIX] Sports updated:');
console.log(db.prepare('SELECT id, name, image_url FROM sports').all());
