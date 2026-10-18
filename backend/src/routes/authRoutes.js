import { Router } from 'express';
import { register, login, staffLogin, adminLogin, me, logout } from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';

const r = Router();

r.post('/register', register);
r.post('/login', login);
r.post('/member-login', login);
r.post('/staff-login', staffLogin);
r.post('/admin-login', adminLogin);
r.get('/me', requireAuth, me);
r.post('/logout', requireAuth, logout);

export default r;

