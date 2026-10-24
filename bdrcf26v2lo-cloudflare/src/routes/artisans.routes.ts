import { Router, Request, Response, NextFunction } from 'express';
import { artisansRepository } from '../repositories/factory';
import { authenticate } from '../middleware/authenticate';
import { manageOperations, managePeople } from '../middleware/permissions';

const router = Router();

router.get('/artisans', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const list = await artisansRepository.listArtisans();
    res.status(200).json({ data: list });
  } catch (err) {
    next(err);
  }
});

router.post('/artisans', authenticate, manageOperations, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body;
    if (!body.name || !body.responsibility || !body.shift) {
      res.status(400).json({ error: { code: 'VALIDATION_FAILED', message: 'name, responsibility and shift are required' } });
      return;
    }
    const id = body.id || `artisan-${Math.random().toString(36).substring(2, 10)}`;
    const saved = await artisansRepository.saveArtisan({
      id,
      name: body.name,
      responsibility: body.responsibility,
      shift: body.shift,
      employeeNumber: body.employeeNumber,
    });
    res.status(201).json({ data: saved });
  } catch (err) {
    next(err);
  }
});

router.delete('/artisans/:id', authenticate, managePeople, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    await artisansRepository.deleteArtisan(id);
    res.status(200).json({ data: { success: true, id } });
  } catch (err) {
    next(err);
  }
});

export default router;
