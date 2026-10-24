import { IReportsRepository } from '../interfaces/reports.repository.interface';
import { BreakdownReport } from '../../domain/types';
import { getDb } from '../../db/d1';
import { randomUUID } from 'crypto';

export class D1ReportsRepository implements IReportsRepository {
  constructor(private env?: any) {}

  async getReport(id: string): Promise<BreakdownReport | null> {
    const db = getDb(this.env);
    const row = await db.prepare('SELECT data FROM reports WHERE id = ? LIMIT 1').bind(id).first();
    if (!row || !row.data) return null;
    return JSON.parse(row.data as string) as BreakdownReport;
  }

  async listReports(hours: number, limitCount: number): Promise<BreakdownReport[]> {
    const db = getDb(this.env);
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - hours);
    
    const { results } = await db.prepare(
      'SELECT data FROM reports WHERE reporting_time >= ? ORDER BY reporting_time DESC LIMIT ?'
    ).bind(cutoff.toISOString(), limitCount).all();

    if (!results) return [];
    return results.map((row: any) => JSON.parse(row.data as string) as BreakdownReport);
  }

  async createReport(reportData: Omit<BreakdownReport, 'id'>, operationId?: string): Promise<BreakdownReport> {
    const db = getDb(this.env);
    const id = operationId || randomUUID();
    const fullReport: BreakdownReport = { id, ...reportData };
    const reportingTime = fullReport.reportingTime || new Date().toISOString();

    await db.prepare(`
      INSERT INTO reports (id, equipment, equipment_number, reported_fault, urgency, reporting_time, status, work_group, data, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO NOTHING
    `).bind(
      id,
      fullReport.equipment || '',
      fullReport.equipmentNumber || '',
      fullReport.reportedFault || '',
      fullReport.urgency || 1,
      reportingTime,
      fullReport.status || 'Active',
      fullReport.workGroup || '',
      JSON.stringify(fullReport),
      new Date().toISOString()
    ).run();

    return (await this.getReport(id))!;
  }

  async updateReport(id: string, updates: Partial<BreakdownReport>): Promise<BreakdownReport> {
    const db = getDb(this.env);
    const existing = await this.getReport(id);
    if (!existing) throw new Error(`Report ${id} not found`);

    const updated: BreakdownReport = { ...existing, ...updates };

    await db.prepare(`
      UPDATE reports SET
        equipment = ?,
        equipment_number = ?,
        reported_fault = ?,
        urgency = ?,
        status = ?,
        work_group = ?,
        data = ?
      WHERE id = ?
    `).bind(
      updated.equipment || '',
      updated.equipmentNumber || '',
      updated.reportedFault || '',
      updated.urgency || 1,
      updated.status || 'Active',
      updated.workGroup || '',
      JSON.stringify(updated),
      id
    ).run();

    return updated;
  }

  async deleteReport(id: string): Promise<boolean> {
    const db = getDb(this.env);
    await db.prepare('DELETE FROM reports WHERE id = ?').bind(id).run();
    return true;
  }

  async purgeReports(cutoffIsoDate: string): Promise<number> {
    const db = getDb(this.env);
    const beforeCountRow = await db.prepare('SELECT COUNT(*) as count FROM reports WHERE reporting_time < ?').bind(cutoffIsoDate).first();
    const count = beforeCountRow ? Number(beforeCountRow.count) : 0;
    await db.prepare('DELETE FROM reports WHERE reporting_time < ?').bind(cutoffIsoDate).run();
    return count;
  }
}

