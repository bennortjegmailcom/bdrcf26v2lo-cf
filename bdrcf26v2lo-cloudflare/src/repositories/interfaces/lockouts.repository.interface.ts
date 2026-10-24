import { JobTicket, LockoutAuditEvent } from '../../domain/types';

export interface ILockoutsRepository {
  getLockout(id: string): Promise<JobTicket | null>;
  listLockouts(): Promise<JobTicket[]>;
  createLockout(ticket: Omit<JobTicket, 'id'>, id?: string): Promise<JobTicket>;
  updateLockoutWithAudit(
    id: string,
    updates: Partial<JobTicket>,
    auditEvent: LockoutAuditEvent
  ): Promise<JobTicket>;
}
