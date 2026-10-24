import { Request, Response, NextFunction } from 'express';
import { EquipmentService } from '../services/equipment.service';

export class EquipmentController {
  constructor(private equipmentService: EquipmentService) {}

  getEquipmentByNumber = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const equipmentNumber = req.params.equipmentNumber as string;
      const equip = await this.equipmentService.getEquipmentByNumber(equipmentNumber);
      res.status(200).json({ data: equip });
    } catch (err) {
      next(err);
    }
  };

  listEquipment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const list = await this.equipmentService.listEquipment();
      res.status(200).json({ data: list });
    } catch (err) {
      next(err);
    }
  };
}
