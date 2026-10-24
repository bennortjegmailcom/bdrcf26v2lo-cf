import { User, Artisan, Operator, UserMessage, JobTicket, AuditLogEntry, BreakdownReport, Status, Role } from '../types';
import { USERS, INITIAL_REPORTS, INITIAL_ARTISANS } from '../constants';
import { sealAuditLogEntry } from './tamperProofAudit';
import { enqueueOfflineAction } from './offlineQueue';
import { BdrApiClient } from '../src/repositories/api/BdrApiClient';

const apiClient = new BdrApiClient();

// Helper to ensure authenticated session token for API calls
async function ensureAuthToken(): Promise<string> {
  // Cloudflare Access owns session renewal; the browser sends its secure cookie.
  return '';
}

export const dataSyncService = {
  getApiClient(): BdrApiClient {
    return apiClient;
  },

  async ensureAuth(): Promise<void> {
    await ensureAuthToken();
  },

  // 1. Subscribe to Authoritative Users from Cloudflare D1
  subscribeUsers(callback: (users: User[]) => void): () => void {
    let active = true;
    const fetchUsers = async () => {
      try {
        await ensureAuthToken();
        const users = await apiClient.request<User[]>('/users');
        if (active && Array.isArray(users) && users.length > 0) {
          localStorage.setItem('cache_users', JSON.stringify(users));
          callback(users);
          return;
        }
      } catch (err) {
        // Fallback to cache during network blip
      }
      try {
        const cached = localStorage.getItem('cache_users');
        const users = cached ? JSON.parse(cached) : USERS;
        if (active) callback(users);
      } catch {
        if (active) callback(USERS);
      }
    };

    fetchUsers();
    const interval = setInterval(fetchUsers, 3000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  },

  // 2. Subscribe to Authoritative Artisans from Cloudflare D1
  subscribeArtisans(callback: (artisans: Artisan[]) => void): () => void {
    let active = true;
    const fetchArtisans = async () => {
      try {
        await ensureAuthToken();
        const list = await apiClient.request<Artisan[]>('/artisans');
        if (active && Array.isArray(list) && list.length > 0) {
          localStorage.setItem('cache_artisans', JSON.stringify(list));
          callback(list);
          return;
        }
      } catch (err) {
        // network fallback
      }
      try {
        const cached = localStorage.getItem('cache_artisans');
        const artisans = cached ? JSON.parse(cached) : INITIAL_ARTISANS;
        if (active) callback(artisans);
      } catch {
        if (active) callback(INITIAL_ARTISANS);
      }
    };

    fetchArtisans();
    const interval = setInterval(fetchArtisans, 3000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  },

  // 3. Operators
  subscribeOperators(callback: (operators: Operator[]) => void): () => void {
    let active = true;
    const load = async () => {
      try {
        const metadata = await apiClient.request<{ operators: Operator[] }>('/metadata');
        if (active) {
          localStorage.setItem('cache_operators', JSON.stringify(metadata.operators));
          callback(metadata.operators);
        }
      } catch {
        const cached = localStorage.getItem('cache_operators');
        const ops = cached ? JSON.parse(cached) : [];
        if (active) callback(ops);
      }
    };
    load();
    const interval = setInterval(load, 3000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  },

  // 4. Admin Messages / Notifications from Cloudflare D1
  subscribeAdminMessages(callback: (messages: UserMessage[]) => void): () => void {
    let active = true;
    const fetchMsgs = async () => {
      try {
        await ensureAuthToken();
        const notifs = await apiClient.request<any[]>('/notifications');
        if (active && Array.isArray(notifs)) {
          const msgs: UserMessage[] = notifs.map(n => ({
            id: n.id,
            senderId: 'system',
            senderName: 'Dispatch System',
            category: 'Notification',
            content: n.message,
            timestamp: n.timestamp,
            isReadByAdmin: n.isRead,
            wantsReply: false,
            targetUserIds: n.recipientUserId ? [n.recipientUserId] : [],
          }));
          localStorage.setItem('cache_adminMessages', JSON.stringify(msgs));
          callback(msgs);
          return;
        }
      } catch (err) {}
      try {
        const cached = localStorage.getItem('cache_adminMessages');
        const msgs = cached ? JSON.parse(cached) : [];
        if (active) callback(msgs);
      } catch {
        if (active) callback([]);
      }
    };

    fetchMsgs();
    const interval = setInterval(fetchMsgs, 3000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  },

  // 5. Subscribe to Authoritative Job Tickets from Cloudflare D1
  subscribeJobTickets(callback: (tickets: JobTicket[]) => void): () => void {
    let active = true;
    const fetchTickets = async () => {
      try {
        await ensureAuthToken();
        const [jobs, lockouts] = await Promise.all([apiClient.request<JobTicket[]>('/job-tickets'), apiClient.request<JobTicket[]>('/lockouts')]);
        const list = [...jobs, ...lockouts];
        if (active && Array.isArray(list)) {
          localStorage.setItem('cache_jobTickets', JSON.stringify(list));
          callback(list);
          return;
        }
      } catch (err) {}
      try {
        const cached = localStorage.getItem('cache_jobTickets');
        const tickets = cached ? JSON.parse(cached) : [];
        if (active) callback(tickets);
      } catch {
        if (active) callback([]);
      }
    };

    fetchTickets();
    const interval = setInterval(fetchTickets, 3000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  },

  // 6. Subscribe to Tamper-Proof Audit Logs from Cloudflare D1
  subscribeAuditLogs(callback: (logs: AuditLogEntry[]) => void): () => void {
    let active = true;
    const fetchAudit = async () => {
      try {
        await ensureAuthToken();
        const logs = await apiClient.request<AuditLogEntry[]>('/audit-logs');
        if (active && Array.isArray(logs)) {
          localStorage.setItem('cache_auditLogs', JSON.stringify(logs));
          callback(logs);
          return;
        }
      } catch (err) {}
      try {
        const cached = localStorage.getItem('cache_auditLogs');
        const logs = cached ? JSON.parse(cached) : [];
        if (active) callback(logs);
      } catch {
        if (active) callback([]);
      }
    };

    fetchAudit();
    const interval = setInterval(fetchAudit, 3000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  },

  // 7. Subscribe to Authoritative Breakdown Reports from Cloudflare D1
  subscribeReports(hours: number, reportLimitCount: number, callback: (reports: BreakdownReport[]) => void): () => void {
    let active = true;
    const fetchReports = async () => {
      try {
        await ensureAuthToken();
        const reports = await apiClient.request<BreakdownReport[]>(`/reports?hours=${hours}&limit=${reportLimitCount}`);
        if (active && Array.isArray(reports)) {
          localStorage.setItem('cache_reports', JSON.stringify(reports));
          callback(reports);
          return;
        }
      } catch (err) {
        // Fallback to local cache if network is temporarily disconnected
      }
      try {
        const cached = localStorage.getItem('cache_reports');
        const reports = cached ? JSON.parse(cached) : INITIAL_REPORTS;
        if (active) callback(reports.slice(0, reportLimitCount));
      } catch {
        if (active) callback(INITIAL_REPORTS);
      }
    };

    fetchReports();
    const interval = setInterval(fetchReports, 3000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  },

  // Remote Write: Create Breakdown Report in Cloudflare D1
  async addReport(
    currentUser: User, 
    reportData: Omit<BreakdownReport, 'id' | 'reportingTime' | 'reporter' | 'status'>, 
    employeeNumber?: string
  ): Promise<string> {
    await ensureAuthToken();

    try {
      const created = await apiClient.request<BreakdownReport>('/reports', {
        method: 'POST',
        body: JSON.stringify({
          ...reportData,
          workGroup: currentUser.role === Role.REPORTER ? (currentUser.workGroup || reportData.workGroup) : reportData.workGroup,
          reporter: {
            ...currentUser,
            employeeNumber: employeeNumber || currentUser.employeeNumber || null,
          },
        }),
      });

      // Update local read cache with authoritative record
      try {
        const reports = JSON.parse(localStorage.getItem('cache_reports') || '[]');
        reports.unshift(created);
        localStorage.setItem('cache_reports', JSON.stringify(reports));
      } catch {}

      return created.id;
    } catch (err: any) {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        const id = Math.random().toString(36).substring(2, 12);
        const offlineReport: BreakdownReport = {
          id,
          ...reportData,
          reportingTime: new Date().toISOString(),
          reporter: { ...currentUser, employeeNumber: employeeNumber || currentUser.employeeNumber || null },
          status: Status.ACTIVE,
          workGroup: currentUser.role === Role.REPORTER ? (currentUser.workGroup || reportData.workGroup) : reportData.workGroup,
          changeLog: []
        };
        enqueueOfflineAction({ type: 'CREATE_REPORT', payload: offlineReport });
        return id;
      }
      throw new Error(`Cloudflare D1 report creation failed: ${err.message}`);
    }
  },

  // Remote Write: Update Breakdown Report in Cloudflare D1
  async updateReport(
    currentUser: User,
    reportId: string,
    updates: Partial<BreakdownReport>
  ): Promise<BreakdownReport> {
    await ensureAuthToken();
    try {
      const updated = await apiClient.request<BreakdownReport>(`/reports/${reportId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });

      try {
        const cached = JSON.parse(localStorage.getItem('cache_reports') || '[]');
        const updatedList = cached.map((r: BreakdownReport) => r.id === reportId ? updated : r);
        localStorage.setItem('cache_reports', JSON.stringify(updatedList));
      } catch {}

      return updated;
    } catch (err: any) {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        enqueueOfflineAction({ type: 'UPDATE_REPORT', payload: { id: reportId, ...updates } });
      }
      throw new Error(`Cloudflare D1 report update failed: ${err.message}`);
    }
  },

  // Remote Write: Delete Breakdown Report in Cloudflare D1
  async deleteReport(reportId: string): Promise<void> {
    await ensureAuthToken();
    try {
      await apiClient.request<{ success: boolean; id: string }>(`/reports/${reportId}`, {
        method: 'DELETE',
      });
      try {
        const cached = JSON.parse(localStorage.getItem('cache_reports') || '[]');
        const filtered = cached.filter((r: BreakdownReport) => r.id !== reportId);
        localStorage.setItem('cache_reports', JSON.stringify(filtered));
      } catch {}
    } catch (err: any) {
      throw new Error(`Cloudflare D1 delete failed: ${err.message}`);
    }
  },

  // Remote Write: Purge Reports in Cloudflare D1
  async purgeOldReports(cutoffDate: string): Promise<number> {
    await ensureAuthToken();
    try {
      const res = await apiClient.request<{ purgedCount: number }>('/reports/purge', {
        method: 'POST',
        body: JSON.stringify({ cutoffDate }),
      });
      return res.purgedCount;
    } catch (err: any) {
      throw new Error(`Cloudflare D1 purge failed: ${err.message}`);
    }
  },

  // Remote Write: Save or Update User in Cloudflare D1
  async saveUser(user: User): Promise<User> {
    await ensureAuthToken();
    try {
      const me = await apiClient.request<User>('/me');
      if (me.id === user.id && me.role !== Role.ADMIN) {
        return apiClient.request<User>(`/users/${encodeURIComponent(user.id)}`, {
          method: 'PATCH', body: JSON.stringify({ employeeNumber: user.employeeNumber, hoursToShow: user.hoursToShow, notificationSound: user.notificationSound, shift: user.shift }),
        });
      }
      const res = await apiClient.request<User>('/users', {
        method: 'POST',
        body: JSON.stringify(user),
      });
      return res;
    } catch (err: any) {
      throw new Error(`Cloudflare D1 user save failed: ${err.message}`);
    }
  },

  // Remote Write: Delete User in Cloudflare D1
  async deleteUser(userId: string): Promise<void> {
    await ensureAuthToken();
    try {
      await apiClient.request(`/users/${userId}`, {
        method: 'DELETE',
      });
    } catch (err: any) {
      throw new Error(`Cloudflare D1 user delete failed: ${err.message}`);
    }
  },

  // Remote Write: Save Job Ticket in Cloudflare D1
  async saveJobTicket(ticket: JobTicket): Promise<JobTicket> {
    await ensureAuthToken();
    try {
      return await apiClient.request<JobTicket>('/job-tickets', {
        method: 'POST',
        body: JSON.stringify(ticket),
      });
    } catch (err: any) {
      throw new Error(`Cloudflare D1 job ticket save failed: ${err.message}`);
    }
  },

  // Remote Write: Delete Job Ticket in Cloudflare D1
  async deleteJobTicket(ticketId: string): Promise<void> {
    await ensureAuthToken();
    try {
      await apiClient.request(`/job-tickets/${ticketId}`, {
        method: 'DELETE',
      });
    } catch (err: any) {
      throw new Error(`Cloudflare D1 job ticket delete failed: ${err.message}`);
    }
  },

  // Duplicate Report
  async duplicateReport(currentUser: User, reportId: string, currentReports: BreakdownReport[]): Promise<string | null> {
    let original = currentReports.find(r => r.id === reportId);
    if (!original) {
      try {
        const reports = JSON.parse(localStorage.getItem('cache_reports') || '[]');
        original = reports.find((r: any) => r.id === reportId);
      } catch {}
    }
    if (!original) {
      throw new Error("Could not find the original report to duplicate.");
    }
    const { id, notificationNumber, assignments, assignedTime, whatWasWrong, resolutionStatus, resolutionTime, completedTime, reporter, handoverSection, handoverRecipientId, handoverRecipientName, dayshiftAcknowledged, dayshiftAcknowledgedBy, dayshiftAcknowledgedAt, isNextShift, ...data } = original as any;
    
    return this.addReport(currentUser, {
      equipment: data.equipment || '',
      equipmentNumber: data.equipmentNumber || '',
      reportedFault: data.reportedFault || '',
      workGroup: data.workGroup || currentUser.workGroup || '',
      urgency: data.urgency ?? 5,
      changeLog: [],
      details: data.details,
      operatorName: data.operatorName,
    });
  },

  // Remote Write: Append Tamper-Proof Audit Log in Cloudflare D1
  async addAuditLog(
    currentUser: User,
    action: 'CREATE' | 'UPDATE' | 'DELETE', 
    entityType: string, 
    entityId: string, 
    details: string
  ): Promise<void> {
    if (!currentUser) return;
    try {
      const logs: AuditLogEntry[] = JSON.parse(localStorage.getItem('cache_auditLogs') || '[]');
      const sealedEntry = await sealAuditLogEntry({
        timestamp: new Date().toISOString(),
        userId: currentUser.id,
        userName: currentUser.name,
        action,
        entityType,
        entityId,
        details
      }, logs);

      await ensureAuthToken();
      await apiClient.request('/audit-logs', {
        method: 'POST',
        body: JSON.stringify(sealedEntry),
      }).catch(e => {
        console.warn('Audit remote write error, queued locally:', e);
      });

      logs.unshift(sealedEntry);
      localStorage.setItem('cache_auditLogs', JSON.stringify(logs));
    } catch (e) {}
  },

  // Remote Write: Notifications in Cloudflare D1
  async createNotifications(message: string, recipientIds: string[], relatedReportId?: string): Promise<void> {
    if (recipientIds.length === 0) return;
    await ensureAuthToken();

    for (const uid of recipientIds) {
      try {
        await apiClient.request('/notifications', {
          method: 'POST',
          body: JSON.stringify({
            recipientUserId: uid,
            message,
            relatedReportId,
            timestamp: new Date().toISOString(),
          }),
        });
      } catch (e) {
        console.warn('Notification write error:', e);
      }
    }
  },

  // Full Safe Migration: Migrate existing browser storage into Cloudflare D1
  async migrateLocalDataToRemote(): Promise<any> {
    await ensureAuthToken();
    const reports = JSON.parse(localStorage.getItem('cache_reports') || '[]');
    const users = JSON.parse(localStorage.getItem('cache_users') || '[]');
    const artisans = JSON.parse(localStorage.getItem('cache_artisans') || '[]');
    const jobTickets = JSON.parse(localStorage.getItem('cache_jobTickets') || '[]');
    const auditLogs = JSON.parse(localStorage.getItem('cache_auditLogs') || '[]');

    const res = await apiClient.request<any>('/migrate/import', {
      method: 'POST',
      body: JSON.stringify({
        reports,
        users,
        artisans,
        jobTickets,
        auditLogs,
      }),
    });

    return res;
  }
};
