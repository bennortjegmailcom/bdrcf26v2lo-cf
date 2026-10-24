import { Router } from 'express';
import { ReportsController } from '../controllers/reports.controller';
import { ReportsService } from '../services/reports.service';
import { reportsRepository } from '../repositories/factory';
import { authenticate } from '../middleware/authenticate';
import { manageOperations, managePeople } from '../middleware/permissions';

const router = Router();
const reportsService = new ReportsService(reportsRepository);
const controller = new ReportsController(reportsService);

router.get('/reports', authenticate, controller.listReports);
router.get('/reports/:id', authenticate, controller.getReport);
router.post('/reports', authenticate, controller.createReport);
router.patch('/reports/:id', authenticate, manageOperations, controller.updateReport);
router.delete('/reports/:id', authenticate, managePeople, controller.deleteReport);
router.post('/reports/purge', authenticate, managePeople, controller.purgeReports);

export default router;
export { reportsService }; // Export for dependency injection in sync router

