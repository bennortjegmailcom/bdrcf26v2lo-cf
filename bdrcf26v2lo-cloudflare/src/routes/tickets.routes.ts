import { Router, Request, Response, NextFunction } from 'express';
import { jobTicketsRepository } from '../repositories/factory';
import { authenticate } from '../middleware/authenticate';
import { manageOperations, managePeople } from '../middleware/permissions';

const router = Router();

router.get('/job-tickets', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const list = await jobTicketsRepository.listJobTickets();
    res.status(200).json({ data: list });
  } catch (err) {
    next(err);
  }
});

router.get('/job-tickets/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const ticket = await jobTicketsRepository.getJobTicket(id);
    if (!ticket) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: `Job ticket ${id} not found` } });
      return;
    }
    res.status(200).json({ data: ticket });
  } catch (err) {
    next(err);
  }
});

router.post('/job-tickets', authenticate, manageOperations, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body;
    const id = body.id || `ticket-${Math.random().toString(36).substring(2, 10)}`;
    const saved = await jobTicketsRepository.saveJobTicket({
      ...body,
      id,
    });
    res.status(201).json({ data: saved });
  } catch (err) {
    next(err);
  }
});

router.delete('/job-tickets/:id', authenticate, managePeople, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    await jobTicketsRepository.deleteJobTicket(id);
    res.status(200).json({ data: { success: true, id } });
  } catch (err) {
    next(err);
  }
});

export default router;
