import { Equipment } from '../../domain/types';

export interface IEquipmentRepository {
  getEquipmentByNumber(equipmentNumber: string): Promise<Equipment | null>;
  listEquipment(): Promise<Equipment[]>;
}
