import { Router } from 'express';
import * as c from '../controllers/contentController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const r = Router();

r.get('/public', c.publicContent);
r.get('/public/', c.publicContent);
r.get('/notifications', requireAuth, requireRole('USER'), c.notifications);
r.put('/notifications/:id/read', requireAuth, requireRole('USER'), c.markNotification);

// Announcements
r.get('/announcements', requireAuth, requireRole('ADMIN'), c.listAnnouncements);
r.get('/announcements/', requireAuth, requireRole('ADMIN'), c.listAnnouncements);
r.post('/announcements', requireAuth, requireRole('ADMIN'), c.createAnnouncement);
r.post('/announcements/', requireAuth, requireRole('ADMIN'), c.createAnnouncement);
r.put('/announcements/:id', requireAuth, requireRole('ADMIN'), c.updateAnnouncement);
r.put('/announcements/:id/', requireAuth, requireRole('ADMIN'), c.updateAnnouncement);
r.delete('/announcements/:id', requireAuth, requireRole('ADMIN'), c.deleteAnnouncement);
r.delete('/announcements/:id/', requireAuth, requireRole('ADMIN'), c.deleteAnnouncement);

// Offers
r.get('/offers', requireAuth, requireRole('ADMIN'), c.listOffers);
r.get('/offers/', requireAuth, requireRole('ADMIN'), c.listOffers);
r.post('/offers', requireAuth, requireRole('ADMIN'), c.createOffer);
r.post('/offers/', requireAuth, requireRole('ADMIN'), c.createOffer);
r.put('/offers/:id', requireAuth, requireRole('ADMIN'), c.updateOffer);
r.put('/offers/:id/', requireAuth, requireRole('ADMIN'), c.updateOffer);
r.delete('/offers/:id', requireAuth, requireRole('ADMIN'), c.deleteOffer);
r.delete('/offers/:id/', requireAuth, requireRole('ADMIN'), c.deleteOffer);

export default r;

