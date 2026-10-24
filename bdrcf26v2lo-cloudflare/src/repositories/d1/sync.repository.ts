import { ISyncRepository } from '../interfaces/sync.repository.interface';
import { getDb } from '../../db/d1';

export class D1SyncRepository implements ISyncRepository {
  constructor(private env?: any) {}

  async getSavedSyncOperation(operationId: string): Promise<any | null> {
    const db = getDb(this.env);
    const row = await db.prepare('SELECT result FROM sync_operations WHERE operation_id = ? LIMIT 1').bind(operationId).first();
    if (!row || !row.result) return null;
    return JSON.parse(row.result as string);
  }

  async saveSyncOperation(operationId: string, result: any): Promise<void> {
    const db = getDb(this.env);
    await db.prepare(`
      INSERT INTO sync_operations (operation_id, result, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(operation_id) DO UPDATE SET
        result = excluded.result,
        updated_at = excluded.updated_at
    `).bind(
      operationId,
      JSON.stringify(result),
      new Date().toISOString()
    ).run();
  }
}
