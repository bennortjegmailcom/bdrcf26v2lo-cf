import { JobTicket } from '../types';
import { BdrApiClient } from '../src/repositories/api/BdrApiClient';
export interface ILockoutsRepository {
  getLockout(id: string): Promise<JobTicket | null>;
  
  requestLockout(data: {
    equipment: string;
    equipmentNumber: string;
    workGroup: string;
    workType?: string;
    sectionId?: string | null;
    sectionName?: string | null;
    relatedReportId?: string;
    requestedByUserId: string;
    requestedByUserName: string;
    requestedByUserEmployeeNumber?: string;
    bookedDurationMinutes: number | null;
    lockoutComments: string;
  }): Promise<string>;

  confirmEquipment(
    ticketId: string, 
    userId: string, 
    userName: string, 
    employeeNumber?: string, 
    qrVerified?: boolean
  ): Promise<void>;

  confirmScadaStop(
    ticketId: string, 
    userId: string, 
    userName: string, 
    employeeNumber: string, 
    comments: string
  ): Promise<void>;

  confirmPhysicalLockout(
    ticketId: string, 
    userId: string, 
    userName: string, 
    employeeNumber: string, 
    comments: string
  ): Promise<void>;

  recordPositiveTest(
    ticketId: string, 
    userId: string, 
    userName: string, 
    employeeNumber: string, 
    result: 'PASS' | 'FAIL', 
    comments: string
  ): Promise<void>;

  requestPositiveTest(
    ticketId: string,
    userId: string,
    userName: string,
    employeeNumber: string,
    result: 'PASS' | 'FAIL',
    comments: string
  ): Promise<void>;

  acknowledgePositiveTest(
    ticketId: string,
    userId: string,
    userName: string,
    employeeNumber: string,
    comments: string,
    method: 'APP' | 'ALTERNATIVE',
    result?: 'PASS' | 'FAIL'
  ): Promise<void>;

  requestLockoutRelease(
    ticketId: string, 
    userId: string, 
    userName: string, 
    employeeNumber: string, 
    comments: string
  ): Promise<void>;

  confirmLockoutRelease(
    ticketId: string, 
    userId: string, 
    userName: string, 
    employeeNumber: string, 
    comments: string
  ): Promise<void>;

  rejectLockout(
    ticketId: string, 
    userId: string, 
    userName: string, 
    employeeNumber: string, 
    reason: string
  ): Promise<void>;

  subscribeLockouts(callback: (tickets: JobTicket[]) => void): () => void;
}

export class LockoutService implements ILockoutsRepository {
  private api = new BdrApiClient();
  async getLockout(id: string): Promise<JobTicket | null> { return this.api.request(`/lockouts/${encodeURIComponent(id)}`); }
  private async action(id: string, action: string, data: object): Promise<void> {
    await this.api.request(`/lockouts/${encodeURIComponent(id)}/${action}`, { method: 'POST', body: JSON.stringify(data) });
  }
  async requestLockout(data: Parameters<ILockoutsRepository['requestLockout']>[0]): Promise<string> {
    const ticket = await this.api.request<JobTicket>('/lockouts', { method: 'POST', body: JSON.stringify(data) });
    return ticket.id;
  }
  async confirmEquipment(ticketId: string, _userId: string, _userName: string, employeeNumber?: string, qrVerified?: boolean): Promise<void> {
    await this.action(ticketId, 'confirm-equipment', { employeeNumber, qrVerified });
  }
  async confirmScadaStop(ticketId: string, _userId: string, _userName: string, employeeNumber: string, comments: string): Promise<void> {
    await this.action(ticketId, 'confirm-scada-stop', { employeeNumber, comments });
  }
  async confirmPhysicalLockout(ticketId: string, _userId: string, _userName: string, employeeNumber: string, comments: string): Promise<void> {
    await this.action(ticketId, 'confirm-physical-lockout', { employeeNumber, comments });
  }
  async recordPositiveTest(ticketId: string, _userId: string, _userName: string, employeeNumber: string, result: 'PASS' | 'FAIL', comments: string): Promise<void> {
    await this.action(ticketId, 'positive-test', { employeeNumber, result, comments });
  }
  async requestPositiveTest(ticketId: string, _userId: string, _userName: string, employeeNumber: string, result: 'PASS' | 'FAIL', comments: string): Promise<void> {
    await this.action(ticketId, 'request-positive-test', { employeeNumber, result, comments });
  }
  async acknowledgePositiveTest(ticketId: string, _userId: string, _userName: string, employeeNumber: string, comments: string, method: 'APP' | 'ALTERNATIVE', result?: 'PASS' | 'FAIL'): Promise<void> {
    await this.action(ticketId, 'acknowledge-positive-test', { employeeNumber, comments, method, result });
  }
  async requestLockoutRelease(ticketId: string, _userId: string, _userName: string, employeeNumber: string, comments: string): Promise<void> {
    await this.action(ticketId, 'request-release', { employeeNumber, comments });
  }
  async confirmLockoutRelease(ticketId: string, _userId: string, _userName: string, employeeNumber: string, comments: string): Promise<void> {
    await this.action(ticketId, 'confirm-release', { employeeNumber, comments });
  }
  async rejectLockout(ticketId: string, _userId: string, _userName: string, employeeNumber: string, reason: string): Promise<void> {
    await this.action(ticketId, 'reject', { employeeNumber, reason });
  }
  subscribeLockouts(callback: (tickets: JobTicket[]) => void): () => void {
    let active = true;
    const update = async () => {
      try { const tickets = await this.api.request<JobTicket[]>('/lockouts'); if (active) callback(tickets); }
      catch (err) { console.warn('Could not refresh Cloudflare lockouts', err); }
    };
    void update();
    const timer = setInterval(update, 3000);
    return () => { active = false; clearInterval(timer); };
  }
}
export const lockoutService = new LockoutService();
