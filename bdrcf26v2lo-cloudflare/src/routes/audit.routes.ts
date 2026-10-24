import { Router, Request, Response, NextFunction } from 'express';
import { auditRepository } from '../repositories/factory';
import { authenticate } from '../middleware/authenticate';
import { managePeople } from '../middleware/permissions';

const router = Router();

router.get('/audit-logs', authenticate, managePeople, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limitCount = parseInt(req.query.limit as string, 10) || 1000;
    const logs = await auditRepository.listAuditLogs(limitCount);
    res.status(200).json({ data: logs });
  } catch (err) {
    next(err);
  }
});

router.post('/audit-logs', authenticate, managePeople, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body;
    if (!body.action || !body.entityType || !body.entityId) {
      res.status(400).json({ error: { code: 'VALIDATION_FAILED', message: 'action, entityType, and entityId are required' } });
      return;
    }
    const saved = await auditRepository.appendAuditLog(body);
    res.status(201).json({ data: saved });
  } catch (err) {
    next(err);
  }
});

export default router;
