import bcrypt from 'bcryptjs';
import Joi from 'joi';
import { pool } from '../config/db.js';
import { signToken } from '../utils/auth.js';

const emailField = Joi.string().trim().email({ tlds: { allow: false } }).required();

const registerSchema = Joi.object({
  fullName: Joi.string().trim().min(2).max(120).required(),
  email: emailField,
  mobile: Joi.string().trim().pattern(/^[0-9+\- ]{8,20}$/).required(),
  password: Joi.string().min(8).max(72).required(),
  confirmPassword: Joi.string().valid(Joi.ref('password')).required()
});

const loginSchema = Joi.object({
  email: emailField,
  password: Joi.string().min(1).required()
});

function cleanUser(row) {
  return {
    id: Number(row.id),
    full_name: row.full_name,
    email: row.email,
    mobile: row.mobile,
    role: row.role,
    is_active: Number(row.is_active)
  };
}

export async function register(req, res, next) {
  try {
    const { error, value } = registerSchema.validate(req.body, { abortEarly: true });
    if (error) return res.status(400).json({ message: error.details[0].message });

    const email = value.email.toLowerCase();
    const [existing] = await pool.query('SELECT id FROM users WHERE email=? LIMIT 1', [email]);
    if (existing.length) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    const hash = await bcrypt.hash(value.password, 12);
    const [result] = await pool.query(
      "INSERT INTO users(full_name,email,mobile,password_hash,role,is_active) VALUES(?,?,?,?, 'USER',1)",
      [value.fullName, email, value.mobile, hash]
    );

    const [rows] = await pool.query(
      'SELECT id,full_name,email,mobile,role,is_active FROM users WHERE id=? LIMIT 1',
      [result.insertId]
    );

    const user = cleanUser(rows[0]);
    return res.status(201).json({ token: signToken(user), user });
  } catch (error) {
    console.error('[AUTH_REGISTER_ERROR]', error);
    next(error);
  }
}

async function loginAs(req, res, role) {
  const { error, value } = loginSchema.validate(req.body, { abortEarly: true });
  if (error) return res.status(400).json({ message: error.details[0].message });

  const email = value.email.toLowerCase();
  const [rows] = await pool.query(
    'SELECT id,full_name,email,mobile,password_hash,role,is_active FROM users WHERE email=? AND role=? LIMIT 1',
    [email, role]
  );

  const account = rows[0];
  if (!account) {
    return res.status(401).json({ message: 'Invalid email or password.' });
  }

  const passwordMatches = await bcrypt.compare(value.password, account.password_hash);
  if (!passwordMatches) {
    return res.status(401).json({ message: 'Invalid email or password.' });
  }

  if (!Number(account.is_active)) {
    return res.status(403).json({ message: 'This account is inactive.' });
  }

  const user = cleanUser(account);
  const token = signToken(user);
  return res.json({ token, user });
}

export const login = async (req, res, next) => {
  try {
    await loginAs(req, res, 'USER');
  } catch (error) {
    console.error('[AUTH_USER_LOGIN_ERROR]', {
      message: error?.message,
      code: error?.code,
      name: error?.name,
      stack: error?.stack
    });
    next(error);
  }
};

export const adminLogin = async (req, res, next) => {
  try {
    await loginAs(req, res, 'ADMIN');
  } catch (error) {
    console.error('[AUTH_ADMIN_LOGIN_ERROR]', {
      message: error?.message,
      code: error?.code,
      name: error?.name,
      stack: error?.stack
    });
    next(error);
  }
};

export const me = (req, res) => res.json({ user: req.user });
export const logout = (req, res) => res.json({ message: 'Logged out. Discard the local token.' });
