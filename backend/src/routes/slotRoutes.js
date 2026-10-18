import { Router } from 'express';
import * as c from '../controllers/slotController.js';
import { requireAuth, optionalAuth, requireRole } from '../middleware/auth.js';

const r = Router();

r.get('/', optionalAuth, c.listSlots);
r.get('/mine', optionalAuth, c.listSlots);
r.post('/', requireAuth, requireRole('ADMIN'), c.createSlot);
r.put('/:id', requireAuth, requireRole('ADMIN'), c.updateSlot);
r.delete('/:id', requireAuth, requireRole('ADMIN'), c.deleteSlot);
r.post('/block', requireAuth, requireRole('ADMIN'), c.blockSlot);

export default r;

