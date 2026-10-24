import { AuditLogEntry } from '../../../types';
import { getDb } from '../../db/d1';

export class D1AuditRepository {
  constructor(private env?: any) {}

  async listAuditLogs(limitCount = 1000): Promise<AuditLogEntry[]> {
    const db = getDb(this.env);
    const { results } = await db.prepare(
      'SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT ?'
    ).bind(limitCount).all();

    if (!results) return [];
    return results.map((row: any) => ({
      id: row.id,
      timestamp: row.timestamp,
      userId: row.user_id,
      userName: row.user_name,
      action: row.action,
      entityType: row.entity_type,
      entityId: row.entity_id,
      details: row.details,
      previousHash: row.previous_hash || undefined,
      hash: row.hash,
    }));
  }

  async appendAuditLog(entry: AuditLogEntry): Promise<AuditLogEntry> {
    const db = getDb(this.env);
    const id = entry.id || `audit-${Math.random().toString(36).substring(2, 10)}`;
    await db.prepare(`
      INSERT INTO audit_logs (id, timestamp, user_id, user_name, action, entity_type, entity_id, details, previous_hash, hash, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      entry.timestamp || new Date().toISOString(),
      entry.userId,
      entry.userName,
      entry.action,
      entry.entityType,
      entry.entityId,
      entry.details || '',
      entry.previousHash || '',
      entry.hash || '',
      new Date().toISOString()
    ).run();

    return { ...entry, id };
  }
}
