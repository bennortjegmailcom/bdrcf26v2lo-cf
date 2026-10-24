import { Router } from 'express';
import { EquipmentController } from '../controllers/equipment.controller';
import { EquipmentService } from '../services/equipment.service';
import { D1EquipmentRepository } from '../repositories/d1/equipment.repository';
import { authenticate } from '../middleware/authenticate';

const router = Router();
const equipmentRepository = new D1EquipmentRepository();
const equipmentService = new EquipmentService(equipmentRepository);
const controller = new EquipmentController(equipmentService);

router.get('/equipment', authenticate, controller.listEquipment);
router.get('/equipment/:equipmentNumber', authenticate, controller.getEquipmentByNumber);

export default router;
