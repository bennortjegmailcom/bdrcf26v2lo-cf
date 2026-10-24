import { Router, Request, Response, NextFunction } from 'express';
import { notificationsRepository } from '../repositories/factory';
import { authenticate } from '../middleware/authenticate';
import { manageOperations } from '../middleware/permissions';
import { Role } from '../domain/types';

const router = Router();

router.get('/notifications', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.role === Role.ADMIN ? req.query.userId as string | undefined : req.user!.id;
    const notifs = await notificationsRepository.listNotifications(userId);
    res.status(200).json({ data: notifs });
  } catch (err) {
    next(err);
  }
});

router.post('/notifications', authenticate, manageOperations, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body;
    if (!body.recipientUserId || !body.message) {
      res.status(400).json({ error: { code: 'VALIDATION_FAILED', message: 'recipientUserId and message are required' } });
      return;
    }
    const created = await notificationsRepository.createNotification({
      recipientUserId: body.recipientUserId,
      message: body.message,
      relatedReportId: body.relatedReportId,
      isRead: false,
      timestamp: body.timestamp || new Date().toISOString(),
    });
    res.status(201).json({ data: created });
  } catch (err) {
    next(err);
  }
});

router.patch('/notifications/:id/read', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    if (req.user!.role !== Role.ADMIN) {
      const own = await notificationsRepository.listNotifications(req.user!.id);
      if (!own.some(n => n.id === id)) {
        res.status(403).json({ error: { code: 'UNAUTHORIZED', message: 'Notification does not belong to this user' } });
        return;
      }
    }
    await notificationsRepository.markAsRead(id);
    res.status(200).json({ data: { success: true, id } });
  } catch (err) {
    next(err);
  }
});

export default router;
