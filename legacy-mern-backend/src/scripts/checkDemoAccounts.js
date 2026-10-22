import bcrypt from 'bcryptjs';
import { pool } from '../config/db.js';

const accounts = [
  { label: 'USER', email: 'user@trooferz.demo', password: 'User@123', role: 'USER' },
  { label: 'ADMIN', email: 'admin@trooferz.demo', password: 'ChangeMe@123', role: 'ADMIN' }
];

try {
  for (const account of accounts) {
    const [rows] = await pool.query(
      'SELECT id,email,role,is_active,password_hash FROM users WHERE email=? LIMIT 1',
      [account.email]
    );
    const row = rows[0];
    console.log(`\n[${account.label}] ${account.email}`);
    console.log('exists:', Boolean(row));
    console.log('role:', row?.role ?? 'missing');
    console.log('active:', row ? Boolean(Number(row.is_active)) : false);
    console.log('password matches:', row ? await bcrypt.compare(account.password, row.password_hash) : false);
  }
} catch (error) {
  console.error('Demo account check failed:', error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
