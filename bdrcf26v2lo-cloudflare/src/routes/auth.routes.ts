import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
const router = Router();
router.post('/auth/token', authenticate, (req, res) => { res.json({ data: { user: req.user } }); });
export default router;
