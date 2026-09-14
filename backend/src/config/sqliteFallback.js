import { DatabaseSync } from 'node:sqlite';
import bcrypt from 'bcryptjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, '../../trooferz.db');

const db = new DatabaseSync(dbPath);

// Register custom SQL functions to match MySQL built-ins
db.function('CURDATE', () => new Date().toISOString().slice(0, 10));
db.function('NOW', () => new Date().toISOString().slice(0, 19).replace('T', ' '));
db.function('MAKETIME', (h, m, s) => {
  const hh = String(h).padStart(2, '0');
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
});
db.function('DATE_FORMAT', (val, fmt) => {
  if (!val) return null;
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  const Y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const H = String(d.getHours()).padStart(2, '0');
  const i = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  let res = fmt;
  res = res.replace(/%Y/g, Y).replace(/%m/g, m).replace(/%d/g, day).replace(/%H/g, H).replace(/%i/g, i).replace(/%s/g, s);
  return res;
});
db.function('YEARWEEK', (val) => {
  const d = new Date(val);
  if (isNaN(d.getTime())) return 0;
  const Y = d.getFullYear();
  const firstJan = new Date(Y, 0, 1);
  const days = Math.floor((d - firstJan) / (24 * 60 * 60 * 1000));
  const week = Math.ceil((days + firstJan.getDay() + 1) / 7);
  return Number(`${Y}${String(week).padStart(2, '0')}`);
});
db.function('CONCAT', (...args) => args.join(''));

function initDb() {
  const schema = `
    CREATE TABLE IF NOT EXISTS roles(id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE);
    CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY AUTOINCREMENT, full_name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, mobile TEXT NOT NULL, password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'USER', is_active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS sports(id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, description TEXT, image_url TEXT, price REAL NOT NULL DEFAULT 0, duration_minutes INTEGER NOT NULL DEFAULT 60, is_active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS facilities(id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, sport_id INTEGER NOT NULL, capacity INTEGER NOT NULL DEFAULT 1, price REAL NOT NULL DEFAULT 0, is_active INTEGER NOT NULL DEFAULT 1, description TEXT, image_url TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS time_slots(id INTEGER PRIMARY KEY AUTOINCREMENT, facility_id INTEGER NOT NULL, start_time TEXT NOT NULL, end_time TEXT NOT NULL, is_available INTEGER NOT NULL DEFAULT 1, UNIQUE(facility_id, start_time, end_time));
    CREATE TABLE IF NOT EXISTS blocked_slots(id INTEGER PRIMARY KEY AUTOINCREMENT, blocked_date TEXT NOT NULL, time_slot_id INTEGER NOT NULL, reason TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(blocked_date, time_slot_id));
    CREATE TABLE IF NOT EXISTS bookings(id INTEGER PRIMARY KEY AUTOINCREMENT, booking_code TEXT NOT NULL UNIQUE, user_id INTEGER NOT NULL, sport_id INTEGER NOT NULL, facility_id INTEGER NOT NULL, time_slot_id INTEGER NOT NULL, booking_date TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'PENDING', amount REAL NOT NULL DEFAULT 0, active_slot_key TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(active_slot_key));
    CREATE TABLE IF NOT EXISTS membership_plans(id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, price REAL NOT NULL, duration_days INTEGER NOT NULL, benefits TEXT NOT NULL, is_active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS memberships(id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, plan_id INTEGER NOT NULL, start_date TEXT NOT NULL, end_date TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'ACTIVE', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS notifications(id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, title TEXT NOT NULL, message TEXT NOT NULL, type TEXT NOT NULL DEFAULT 'SYSTEM', is_read INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS offers(id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, description TEXT, discount_percent REAL NOT NULL DEFAULT 0, valid_until TEXT NOT NULL, is_active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS announcements(id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, message TEXT NOT NULL, is_active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS admin_logs(id INTEGER PRIMARY KEY AUTOINCREMENT, admin_user_id INTEGER NOT NULL, action TEXT NOT NULL, entity_type TEXT, entity_id INTEGER, details TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
  `;
  for (const stmt of schema.split(';').map(s => s.trim()).filter(Boolean)) {
    db.exec(stmt);
  }

  const usersCount = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  if (usersCount === 0) {
    console.log('[SQLITE] Seeding default demo data...');
    db.exec("INSERT INTO roles(name) VALUES('USER'),('ADMIN');");

    const adminHash = bcrypt.hashSync('ChangeMe@123', 10);
    const userHash = bcrypt.hashSync('User@123', 10);

    db.prepare(`INSERT INTO users(full_name,email,mobile,password_hash,role,is_active) VALUES
      ('Trooferz Owner','admin@trooferz.demo','9876543210',?,'ADMIN',1),
      ('Aarav Kulkarni','user@trooferz.demo','9876501234',?,'USER',1),
      ('Sneha Patil','sneha@trooferz.demo','9876505678',?,'USER',1)`).run(adminHash, userHash, userHash);

    db.exec(`INSERT INTO sports(name,description,image_url,price,duration_minutes,is_active) VALUES
      ('Football','Full-size turf football sessions for teams and casual groups.','https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=1200&q=80',1200,60,1),
      ('Cricket','Weekend cricket nets and box-cricket sessions.','https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=1200&q=80',900,60,1),
      ('Badminton','Indoor courts for singles and doubles.','https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=1200&q=80',500,60,1),
      ('Box Cricket','Fast-paced enclosed cricket for social and corporate games.','https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&w=1200&q=80',1000,60,1),
      ('Basketball','Half-court basketball for practice and pickup games.','https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=1200&q=80',800,60,1),
      ('Pickleball','Social and training pickleball sessions.','https://images.unsplash.com/photo-1610557892470-55c6d2a1458d?auto=format&fit=crop&w=1200&q=80',600,60,1);`);

    db.exec(`INSERT INTO facilities(name,sport_id,capacity,price,is_active,description,image_url) VALUES
      ('Arena 1 - Football Turf',1,14,1200,1,'Premium outdoor turf with LED floodlights.','https://images.unsplash.com/photo-1553778263-73a83bab9b0c?auto=format&fit=crop&w=1200&q=80'),
      ('Arena 2 - Box Cricket',4,12,1000,1,'Enclosed box-cricket arena with night lighting.','https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=1200&q=80'),
      ('Court 1 - Badminton',3,4,500,1,'Indoor professional badminton court.','https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=1200&q=80'),
      ('Court 2 - Badminton',3,4,500,1,'Indoor doubles court.','https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=1200&q=80'),
      ('Half Court - Basketball',5,10,800,1,'Floodlit half-court.','https://images.unsplash.com/photo-1519861531473-9200262188bf?auto=format&fit=crop&w=1200&q=80'),
      ('Court 3 - Pickleball',6,4,600,1,'Dedicated pickleball court.','https://images.unsplash.com/photo-1610557892470-55c6d2a1458d?auto=format&fit=crop&w=1200&q=80');`);

    for (let fId = 1; fId <= 6; fId++) {
      for (let hour = 6; hour <= 21; hour++) {
        const sh = String(hour).padStart(2, '0');
        const eh = String(hour + 1).padStart(2, '0');
        db.prepare('INSERT INTO time_slots(facility_id,start_time,end_time,is_available) VALUES(?,?,?,1)').run(fId, `${sh}:00:00`, `${eh}:00:00`);
      }
    }

    db.exec(`INSERT INTO membership_plans(name,price,duration_days,benefits,is_active) VALUES
      ('Starter Pass',999,30,'5% booking offer\nPriority support\n1 guest pass',1),
      ('Club Pro',2499,90,'10% booking offer\nPriority booking window\n3 guest passes\nFree court change once',1),
      ('Elite Annual',7999,365,'15% booking offer\nEarly slot access\n12 guest passes\nQuarterly coach clinic',1);`);

    db.exec(`INSERT INTO memberships(user_id,plan_id,start_date,end_date,status) VALUES
      (2,2,datetime('now'),datetime('now','+90 days'),'ACTIVE'),
      (3,1,datetime('now','-20 days'),datetime('now','+10 days'),'ACTIVE');`);

    db.exec(`INSERT INTO offers(title,description,discount_percent,valid_until,is_active) VALUES
      ('Monsoon Squad Deal','Book selected evening football slots as a group and save.',12,date('now','+20 days'),1),
      ('Weekday Badminton Boost','Demo offer on weekday daytime badminton.',10,date('now','+35 days'),1),
      ('Corporate League','Create a regular corporate slot block.',15,date('now','+45 days'),1);`);

    db.exec(`INSERT INTO announcements(title,message,is_active) VALUES
      ('Welcome to Trooferz','Functional local-development demo. Seed records are fictional.',1),
      ('Prime hours','Evening slots fill quickly. Check availability before confirming.',1),
      ('Club launch week','Explore all facilities before choosing a plan.',1);`);

    db.exec(`INSERT INTO notifications(user_id,title,message,type,is_read) VALUES
      (2,'Welcome to Trooferz','Your demo account is ready. Explore sports and book a time slot.','SYSTEM',0),
      (2,'Membership update','Your Club Pro membership is active in the demo environment.','MEMBERSHIP',0),
      (3,'Welcome to Trooferz','Your demo account is ready.','SYSTEM',1);`);
  }
}

initDb();

function prepareSql(sql) {
  return sql
    .replace(/\s+FOR\s+UPDATE/gi, '')
    .replace(/CURDATE\(\)\s*-\s*INTERVAL\s+(\d+)\s+DAY/gi, "date('now', '-$1 days')")
    .replace(/day\s*\+\s*INTERVAL\s+1\s+DAY/gi, "date(day, '+1 day')")
    .replace(/DATE_SUB\(\s*CURDATE\(\)\s*,\s*INTERVAL\s+(\d+)\s+DAY\s*\)/gi, "date('now', '-$1 days')")
    .replace(/DATE_ADD\(\s*CURDATE\(\)\s*,\s*INTERVAL\s+(\d+)\s+DAY\s*\)/gi, "date('now', '+$1 days')")
    .replace(/DATE_ADD\(\s*NOW\(\)\s*,\s*INTERVAL\s+(\d+)\s+DAY\s*\)/gi, "datetime('now', '+$1 days')");
}

function runQuery(sql, params = []) {
  const cleaned = prepareSql(sql);
  const isSelect = /^\s*(SELECT|WITH|PRAGMA|EXPLAIN)/i.test(cleaned);
  const stmt = db.prepare(cleaned);

  if (isSelect) {
    const rows = stmt.all(...params);
    return [rows, []];
  } else {
    const res = stmt.run(...params);
    const resultHeader = {
      insertId: Number(res.lastInsertRowid),
      affectedRows: Number(res.changes)
    };
    return [resultHeader, []];
  }
}

export const sqlitePool = {
  async query(sql, params) {
    return runQuery(sql, params);
  },
  async execute(sql, params) {
    return runQuery(sql, params);
  },
  async getConnection() {
    return {
      async query(sql, params) {
        return runQuery(sql, params);
      },
      async execute(sql, params) {
        return runQuery(sql, params);
      },
      async beginTransaction() {
        db.exec('BEGIN IMMEDIATE');
      },
      async commit() {
        try { db.exec('COMMIT'); } catch (e) {}
      },
      async rollback() {
        try { db.exec('ROLLBACK'); } catch (e) {}
      },
      release() {}
    };
  },
  async end() {}
};
