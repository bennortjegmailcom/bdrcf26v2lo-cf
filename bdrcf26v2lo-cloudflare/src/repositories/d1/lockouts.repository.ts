import { ILockoutsRepository } from '../interfaces/lockouts.repository.interface';
import { JobTicket, LockoutAuditEvent } from '../../domain/types';
import { getDb } from '../../db/d1';
import { randomUUID } from 'crypto';
import { ConflictError } from '../../errors/api.error';

export class D1LockoutsRepository implements ILockoutsRepository {
  constructor(private env?: any) {}

  async getLockout(id: string): Promise<JobTicket | null> {
    const db = getDb(this.env);
    const row = await db.prepare('SELECT data FROM lockouts WHERE id = ? LIMIT 1').bind(id).first();
    if (!row || !row.data) return null;
    return JSON.parse(row.data as string) as JobTicket;
  }

  async listLockouts(): Promise<JobTicket[]> {
    const db = getDb(this.env);
    const { results } = await db.prepare('SELECT data FROM lockouts ORDER BY lockout_time DESC').all();
    if (!results) return [];
    return results.map((row: any) => JSON.parse(row.data as string) as JobTicket);
  }

  async createLockout(ticketData: Omit<JobTicket, 'id'>, operationId?: string): Promise<JobTicket> {
    const db = getDb(this.env);
    const id = operationId || randomUUID();
    const fullTicket: JobTicket = { id, ...ticketData };
    const lockoutTime = fullTicket.lockoutTime || new Date().toISOString();

    await db.prepare(`
      INSERT INTO lockouts (id, equipment, equipment_number, work_group, status, lockout_time, data, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO NOTHING
    `).bind(
      id,
      fullTicket.equipment || '',
      fullTicket.equipmentNumber || '',
      fullTicket.workGroup || '',
      fullTicket.status || 'Locked',
      lockoutTime,
      JSON.stringify(fullTicket),
      new Date().toISOString()
    ).run();

    return (await this.getLockout(id))!;
  }

  async updateLockoutWithAudit(
    id: string,
    updates: Partial<JobTicket>,
    auditEvent: LockoutAuditEvent
  ): Promise<JobTicket> {
    const db = getDb(this.env);
    const row = await db.prepare('SELECT data FROM lockouts WHERE id = ?').bind(id).first();
    if (!row?.data) throw new Error(`Lockout ticket ${id} not found`);
    const originalData = row.data as string;
    const existing = JSON.parse(originalData) as JobTicket;
    if (existing.status !== auditEvent.previousState) {
      throw new ConflictError('Lockout changed before this action; refresh and retry', 'STALE_LOCKOUT');
    }

    const auditEvents = [...(existing.auditEvents || []), auditEvent];

    const updated: JobTicket = { ...existing, ...updates, auditEvents };

    const write = await db.prepare(`
      UPDATE lockouts SET
        equipment = ?,
        equipment_number = ?,
        work_group = ?,
        status = ?,
        data = ?
      WHERE id = ? AND data = ?
    `).bind(
      updated.equipment || '',
      updated.equipmentNumber || '',
      updated.workGroup || '',
      updated.status || existing.status,
      JSON.stringify(updated),
      id,
      originalData
    ).run();

    // D1 reports changes under meta; the local SQLite adapter reports changes directly.
    if (Number(write.meta?.changes ?? write.changes ?? 0) !== 1) {
      throw new ConflictError('Lockout changed during this action; refresh and retry', 'STALE_LOCKOUT');
    }

    return updated;
  }
}
