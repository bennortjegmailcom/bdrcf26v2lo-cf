import { Router } from 'express';
import { SyncController } from '../controllers/sync.controller';
import { SyncService } from '../services/sync.service';
import { D1SyncRepository } from '../repositories/d1/sync.repository';
import { reportsService } from './reports.routes';
import { lockoutService } from './lockouts.routes';
import { authenticate } from '../middleware/authenticate';

const router = Router();
const syncRepository = new D1SyncRepository();
const syncService = new SyncService(syncRepository, reportsService, lockoutService);
const controller = new SyncController(syncService);

router.post('/sync', authenticate, controller.processSync);

export default router;
