import { BreakdownReport } from '../../domain/types';

export interface IReportsRepository {
  getReport(id: string): Promise<BreakdownReport | null>;
  listReports(hours: number, limitCount: number): Promise<BreakdownReport[]>;
  createReport(report: Omit<BreakdownReport, 'id'>, id?: string): Promise<BreakdownReport>;
  updateReport(id: string, updates: Partial<BreakdownReport>): Promise<BreakdownReport>;
  deleteReport(id: string): Promise<boolean>;
  purgeReports(cutoffIsoDate: string): Promise<number>;
}

