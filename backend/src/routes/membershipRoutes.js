import { Router } from 'express';
import * as c from '../controllers/membershipController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const r = Router();

r.get('/plans', c.plans);
r.get('/plans/admin', requireAuth, requireRole('ADMIN'), c.adminPlans);
r.get('/mine', requireAuth, requireRole('USER'), c.myMemberships);
r.post('/activate', requireAuth, requireRole('USER'), c.activateMembership);
r.post('/activate/', requireAuth, requireRole('USER'), c.activateMembership);
r.post('/freeze', requireAuth, requireRole('USER'), c.freezeMembership);
r.post('/freeze/', requireAuth, requireRole('USER'), c.freezeMembership);
r.post('/unfreeze', requireAuth, requireRole('USER'), c.unfreezeMembership);
r.post('/unfreeze/', requireAuth, requireRole('USER'), c.unfreezeMembership);
r.get('/', requireAuth, requireRole('ADMIN'), c.adminMemberships);
r.post('/plans', requireAuth, requireRole('ADMIN'), c.createPlan);
r.put('/plans/:id', requireAuth, requireRole('ADMIN'), c.updatePlan);

export default r;

