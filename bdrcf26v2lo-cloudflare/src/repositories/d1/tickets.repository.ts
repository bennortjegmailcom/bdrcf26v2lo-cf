import { JobTicket } from '../../../types';
import { getDb } from '../../db/d1';

export class D1JobTicketsRepository {
  constructor(private env?: any) {}

  async listJobTickets(): Promise<JobTicket[]> {
    const db = getDb(this.env);
    const { results } = await db.prepare('SELECT data FROM job_tickets ORDER BY created_at DESC LIMIT 500').all();
    if (!results) return [];
    return results.map((row: any) => JSON.parse(row.data as string) as JobTicket);
  }

  async getJobTicket(id: string): Promise<JobTicket | null> {
    const db = getDb(this.env);
    const row = await db.prepare('SELECT data FROM job_tickets WHERE id = ? LIMIT 1').bind(id).first();
    if (!row || !row.data) return null;
    return JSON.parse(row.data as string) as JobTicket;
  }

  async saveJobTicket(ticket: JobTicket): Promise<JobTicket> {
    const db = getDb(this.env);
    await db.prepare(`
      INSERT INTO job_tickets (
        id, report_id, ticket_number, equipment, equipment_number, work_group, urgency, status,
        lead_artisan_id, lead_artisan_name, data, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        report_id = excluded.report_id,
        ticket_number = excluded.ticket_number,
        equipment = excluded.equipment,
        equipment_number = excluded.equipment_number,
        work_group = excluded.work_group,
        urgency = excluded.urgency,
        status = excluded.status,
        lead_artisan_id = excluded.lead_artisan_id,
        lead_artisan_name = excluded.lead_artisan_name,
        data = excluded.data,
        updated_at = excluded.updated_at
    `).bind(
      ticket.id,
      ticket.relatedReportId || '',
      ticket.id,
      ticket.equipment || '',
      ticket.equipmentNumber || '',
      ticket.workGroup || '',
      1,
      ticket.status || 'LOCKOUT_REQUESTED',
      ticket.lockedByUserId || '',
      ticket.lockedByUserName || '',
      JSON.stringify(ticket),
      (ticket as any).createdAt || new Date().toISOString(),
      new Date().toISOString()
    ).run();
    return ticket;
  }

  async deleteJobTicket(id: string): Promise<void> {
    const db = getDb(this.env);
    await db.prepare('DELETE FROM job_tickets WHERE id = ?').bind(id).run();
  }
}
