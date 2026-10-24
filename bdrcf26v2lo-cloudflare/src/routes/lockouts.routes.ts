import { z } from 'zod';
import { positiveTestSchema } from '../validation/schemas';
import { ValidationError } from '../errors/api.error';
import { Router } from 'express';
import { LockoutsController } from '../controllers/lockouts.controller';
import { LockoutService } from '../services/lockout.service';
import { D1LockoutsRepository } from '../repositories/d1/lockouts.repository';
import { authenticate } from '../middleware/authenticate';
import { confirmOperations, confirmMaintenance } from '../middleware/permissions';

const router = Router();
const lockoutsRepository = new D1LockoutsRepository();
const lockoutService = new LockoutService(lockoutsRepository);
const controller = new LockoutsController(lockoutService);

router.get('/lockouts', authenticate, controller.listLockouts);
router.get('/lockouts/:id', authenticate, controller.getLockout);
router.post('/lockouts', authenticate, confirmMaintenance, controller.createLockout);

router.post('/lockouts/:id/confirm-equipment', authenticate, confirmMaintenance, controller.confirmEquipment);
router.post('/lockouts/:id/confirm-scada-stop', authenticate, confirmOperations, controller.confirmScadaStop);
router.post('/lockouts/:id/confirm-physical-lockout', authenticate, confirmMaintenance, controller.confirmPhysicalLockout);
router.post('/lockouts/:id/positive-test', authenticate, confirmMaintenance, controller.recordPositiveTest);
router.post('/lockouts/:id/request-release', authenticate, confirmMaintenance, controller.requestRelease);
router.post('/lockouts/:id/confirm-release', authenticate, confirmOperations, controller.confirmRelease);
router.post('/lockouts/:id/reject', authenticate, confirmOperations, controller.rejectLockout);

router.post('/lockouts/:id/request-positive-test', authenticate, confirmMaintenance, async (req, res, next) => {
  try {
    const data = positiveTestSchema.safeParse(req.body);
    if (!data.success) return next(new ValidationError('Invalid test submission', data.error.format()));
    res.json({ data: await lockoutService.requestPositiveTest(req.params.id as string, req.user!, data.data) });
  } catch (err) { next(err); }
});
router.post('/lockouts/:id/acknowledge-positive-test', authenticate, confirmOperations, async (req, res, next) => {
  try {
    const data = z.object({ employeeNumber: z.string().min(1), comments: z.string().max(1000).default(''), method: z.enum(['APP', 'ALTERNATIVE']), result: z.enum(['PASS', 'FAIL']).optional() }).safeParse(req.body);
    if (!data.success) return next(new ValidationError('Invalid test acknowledgement', data.error.format()));
    res.json({ data: await lockoutService.acknowledgePositiveTest(req.params.id as string, req.user!, data.data) });
  } catch (err) { next(err); }
});

export default router;
export { lockoutService }; // Export for sync dependency injection
