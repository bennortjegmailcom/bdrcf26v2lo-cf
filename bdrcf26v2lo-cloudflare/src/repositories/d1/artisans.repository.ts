import { Artisan, Responsibility, Shift } from '../../domain/types';
import { getDb } from '../../db/d1';

export class D1ArtisansRepository {
  constructor(private env?: any) {}

  async listArtisans(): Promise<Artisan[]> {
    const db = getDb(this.env);
    const { results } = await db.prepare('SELECT * FROM artisans WHERE is_active = 1 ORDER BY name ASC').all();
    if (!results) return [];
    return results.map((row: any) => ({
      id: row.id as string,
      name: row.name as string,
      responsibility: row.responsibility as Responsibility,
      shift: row.shift as Shift,
      employeeNumber: (row.employee_number as string) || undefined,
    }));
  }

  async saveArtisan(artisan: Artisan): Promise<Artisan> {
    const db = getDb(this.env);
    await db.prepare(`
      INSERT INTO artisans (id, name, responsibility, shift, employee_number, is_active, created_at)
      VALUES (?, ?, ?, ?, ?, 1, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        responsibility = excluded.responsibility,
        shift = excluded.shift,
        employee_number = excluded.employee_number
    `).bind(
      artisan.id,
      artisan.name,
      artisan.responsibility,
      artisan.shift,
      artisan.employeeNumber || '',
      new Date().toISOString()
    ).run();
    return artisan;
  }

  async deleteArtisan(id: string): Promise<void> {
    const db = getDb(this.env);
    await db.prepare('UPDATE artisans SET is_active = 0 WHERE id = ?').bind(id).run();
  }
}
