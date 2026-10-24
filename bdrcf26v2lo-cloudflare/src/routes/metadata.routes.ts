import { Router } from 'express';
import { getMetadata, putMetadata } from '../controllers/metadata.controller';
import { authenticate } from '../middleware/authenticate';
import { managePeople } from '../middleware/permissions';

const router = Router();

router.get('/metadata', authenticate, getMetadata);
router.put('/metadata/:key', authenticate, managePeople, putMetadata);

export default router;
