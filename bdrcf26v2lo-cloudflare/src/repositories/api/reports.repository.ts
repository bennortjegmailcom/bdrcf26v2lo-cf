import { IReportsRepository } from '../interfaces/reports.repository.interface';
import { BreakdownReport } from '../../domain/types';
import { BdrApiClient } from './BdrApiClient';

export class ApiReportsRepository implements IReportsRepository {
  private client: BdrApiClient;

  constructor() {
    this.client = new BdrApiClient();
  }

  async getReport(id: string): Promise<BreakdownReport | null> {
    try {
      return await this.client.request<BreakdownReport>(`/reports/${id}`);
    } catch (e) {
      return null;
    }
  }
  
  async listReports(hours: number, limitCount: number): Promise<BreakdownReport[]> {
    return await this.client.request<BreakdownReport[]>(`/reports?hours=${hours}&limit=${limitCount}`);
  }

  async createReport(report: Omit<BreakdownReport, 'id'>): Promise<BreakdownReport> {
    return await this.client.request<BreakdownReport>(`/reports`, {
      method: 'POST',
      body: JSON.stringify(report),
    });
  }

  async updateReport(id: string, updates: Partial<BreakdownReport>): Promise<BreakdownReport> {
    return await this.client.request<BreakdownReport>(`/reports/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async deleteReport(id: string): Promise<boolean> {
    await this.client.request(`/reports/${id}`, {
      method: 'DELETE',
    });
    return true;
  }

  async purgeReports(cutoffIsoDate: string): Promise<number> {
    const res = await this.client.request<{ purgedCount: number }>(`/reports/purge`, {
      method: 'POST',
      body: JSON.stringify({ cutoffDate: cutoffIsoDate }),
    });
    return res.purgedCount;
  }
}

