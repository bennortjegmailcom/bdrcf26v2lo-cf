import { Router } from 'express';
import { getMe } from '../controllers/me.controller';
import { authenticate } from '../middleware/authenticate';

const router = Router();

router.get('/me', authenticate, getMe);

export default router;
