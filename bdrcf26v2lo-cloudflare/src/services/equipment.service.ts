import { IEquipmentRepository } from '../repositories/interfaces/equipment.repository.interface';
import { Equipment } from '../domain/types';
import { NotFoundError } from '../errors/api.error';

export class EquipmentService {
  constructor(private equipmentRepo: IEquipmentRepository) {}

  async getEquipmentByNumber(equipmentNumber: string): Promise<Equipment> {
    const equip = await this.equipmentRepo.getEquipmentByNumber(equipmentNumber);
    if (!equip) {
      throw new NotFoundError(`Equipment with tag / number '${equipmentNumber}' not found`);
    }
    return equip;
  }

  async listEquipment(): Promise<Equipment[]> {
    return this.equipmentRepo.listEquipment();
  }
}
