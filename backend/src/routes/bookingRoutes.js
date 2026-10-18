import { Router } from 'express';
import * as c from '../controllers/bookingController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const r = Router();

r.get('/', requireAuth, c.listBookings);
r.post('/', requireAuth, requireRole('USER'), c.createBooking);
r.post('/verify-qr', requireAuth, requireRole('ADMIN', 'STAFF'), c.verifyQr);
r.post('/verify-qr/', requireAuth, requireRole('ADMIN', 'STAFF'), c.verifyQr);
r.put('/:id', requireAuth, requireRole('ADMIN', 'STAFF'), c.updateBooking);
r.delete('/:id', requireAuth, requireRole('ADMIN', 'STAFF'), (req, res, next) => {
  req.body = { status: 'CANCELLED' };
  c.updateBooking(req, res, next);
});

export default r;

