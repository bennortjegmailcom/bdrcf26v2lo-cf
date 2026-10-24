import { IEquipmentRepository } from '../interfaces/equipment.repository.interface';
import { Equipment } from '../../domain/types';
import { getDb } from '../../db/d1';

export class D1EquipmentRepository implements IEquipmentRepository {
  constructor(private env?: any) {}

  async getEquipmentByNumber(equipmentNumber: string): Promise<Equipment | null> {
    const db = getDb(this.env);
    const row = await db.prepare('SELECT * FROM equipment WHERE equipment_number = ? LIMIT 1').bind(equipmentNumber).first();
    if (row) {
      return {
        id: row.id as string,
        name: row.name as string,
        equipmentNumber: row.equipment_number as string,
        workGroup: row.work_group as string,
        status: row.status as string,
      };
    }
    const list = await this.listEquipment();
    return list.find(e => e.equipmentNumber.toLowerCase() === equipmentNumber.toLowerCase()) || null;
  }

  async listEquipment(): Promise<Equipment[]> {
    const db = getDb(this.env);
    const { results } = await db.prepare('SELECT * FROM equipment').all();
    if (results && results.length > 0) {
      return results.map((row: any) => ({
        id: row.id,
        name: row.name,
        equipmentNumber: row.equipment_number,
        workGroup: row.work_group,
        status: row.status,
      }));
    }

    const targetWgs = ['Mechanical', 'Electrical', 'Instrumentation', 'Operations'];
    const derived: Equipment[] = [];
    targetWgs.forEach((wg, idx) => {
      derived.push(
        { id: `derived-eq-${idx}-1`, name: `${wg} Main Crusher`, equipmentNumber: `CR-${100 + idx}`, workGroup: wg, status: 'Operational' },
        { id: `derived-eq-${idx}-2`, name: `${wg} Feed Conveyor`, equipmentNumber: `CV-${200 + idx}`, workGroup: wg, status: 'Operational' },
        { id: `derived-eq-${idx}-3`, name: `${wg} Slurry Pump`, equipmentNumber: `PP-${300 + idx}`, workGroup: wg, status: 'Operational' }
      );
    });
    return derived;
  }
}
