import { IReportsRepository } from '../repositories/interfaces/reports.repository.interface';
import { BreakdownReport, User, Status } from '../domain/types';
import { NotFoundError } from '../errors/api.error';

export class ReportsService {
  constructor(private reportsRepo: IReportsRepository) {}

  async getReport(id: string): Promise<BreakdownReport> {
    const report = await this.reportsRepo.getReport(id);
    if (!report) {
      throw new NotFoundError(`Breakdown report with ID '${id}' not found`);
    }
    return report;
  }

  async listReports(hours: number, limitCount: number): Promise<BreakdownReport[]> {
    return this.reportsRepo.listReports(hours, limitCount);
  }

  async createReport(
    currentUser: User,
    data: Omit<BreakdownReport, 'id' | 'reportingTime' | 'reporter' | 'status'>,
    operationId?: string
  ): Promise<BreakdownReport> {
    const now = new Date().toISOString();
    const reportPayload: Omit<BreakdownReport, 'id'> = {
      ...data,
      reportingTime: now,
      status: data.source === 'field-report' ? Status.DRAFT : Status.ACTIVE,
      isFieldReport: data.source === 'field-report',
      isDraft: data.source === 'field-report',
      reporter: {
        id: currentUser.id,
        name: currentUser.name,
        role: currentUser.role,
        employeeNumber: currentUser.employeeNumber,
        workGroup: currentUser.workGroup,
        shift: currentUser.shift,
      },
      changeLog: [`Report created by ${currentUser.name} at ${now}`],
      assignments: [],
    };

    return this.reportsRepo.createReport(reportPayload, operationId);
  }

  async updateReport(
    id: string,
    currentUser: User,
    updates: Partial<BreakdownReport>
  ): Promise<BreakdownReport> {
    const existing = await this.getReport(id);
    const now = new Date().toISOString();

    const changeLog = [...(existing.changeLog || [])];
    Object.keys(updates).forEach(key => {
      const val = (updates as any)[key];
      const prev = (existing as any)[key];
      if (val !== undefined && val !== prev) {
        changeLog.push(
          `Field '${key}' changed from '${JSON.stringify(prev)}' to '${JSON.stringify(val)}' by ${currentUser.name} at ${now}`
        );
      }
    });

    const payload: Partial<BreakdownReport> = {
      ...updates,
      changeLog,
    };

    return this.reportsRepo.updateReport(id, payload);
  }

  async deleteReport(id: string): Promise<boolean> {
    await this.getReport(id); // ensure exists
    return this.reportsRepo.deleteReport(id);
  }

  async purgeReports(cutoffIsoDate: string): Promise<number> {
    return this.reportsRepo.purgeReports(cutoffIsoDate);
  }
}

