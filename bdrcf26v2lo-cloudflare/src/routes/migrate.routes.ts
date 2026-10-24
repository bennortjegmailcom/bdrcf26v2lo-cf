import { authorize } from '../middleware/authorize';
import { Role } from '../domain/types';
import { Router, Request, Response, NextFunction } from 'express';
import {
  reportsRepository,
  usersRepository,
  artisansRepository,
  jobTicketsRepository,
  auditRepository,
  notificationsRepository,
} from '../repositories/factory';
import { authenticate } from '../middleware/authenticate';

const router = Router();

// Export full authoritative D1 database snapshot
router.get('/migrate/export', authenticate, authorize([Role.ADMIN]), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [reports, users, artisans, tickets, auditLogs, notifications] = await Promise.all([
      reportsRepository.listReports(8760, 10000), // 1 year limit
      usersRepository.listUsers(),
      artisansRepository.listArtisans(),
      jobTicketsRepository.listJobTickets(),
      auditRepository.listAuditLogs(10000),
      notificationsRepository.listNotifications(),
    ]);

    res.status(200).json({
      timestamp: new Date().toISOString(),
      counts: {
        reports: reports.length,
        users: users.length,
        artisans: artisans.length,
        jobTickets: tickets.length,
        auditLogs: auditLogs.length,
        notifications: notifications.length,
      },
      data: {
        reports,
        users,
        artisans,
        jobTickets: tickets,
        auditLogs,
        notifications,
      },
    });
  } catch (err) {
    next(err);
  }
});

// Controlled, authenticated import of records into D1
router.post('/migrate/import', authenticate, authorize([Role.ADMIN]), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { reports, users, artisans, jobTickets, auditLogs, notifications } = req.body;

    let reportsImported = 0;
    let usersImported = 0;
    let artisansImported = 0;
    let jobTicketsImported = 0;
    let auditLogsImported = 0;
    let notificationsImported = 0;

    // 1. Import Users
    if (Array.isArray(users)) {
      for (const u of users) {
        if (!u.id && !u.uid) continue;
        const existing = await usersRepository.getUserById(u.id || u.uid);
        if (!existing) {
          await usersRepository.saveUser({
            ...u,
            id: u.id || u.uid,
            uid: u.uid || u.id,
          });
          usersImported++;
        }
      }
    }

    // 2. Import Reports
    if (Array.isArray(reports)) {
      for (const r of reports) {
        if (!r.id) continue;
        const existing = await reportsRepository.getReport(r.id);
        if (!existing) {
          await (reportsRepository as any).createReport({
            ...r,
            reportingTime: r.reportingTime || new Date().toISOString(),
          });
          reportsImported++;
        }
      }
    }

    // 3. Import Artisans
    if (Array.isArray(artisans)) {
      const existingArtisans = await artisansRepository.listArtisans();
      const existingIds = new Set(existingArtisans.map(a => a.id));
      for (const a of artisans) {
        if (a.id && !existingIds.has(a.id)) {
          await artisansRepository.saveArtisan(a);
          artisansImported++;
        }
      }
    }

    // 4. Import Job Tickets
    if (Array.isArray(jobTickets)) {
      for (const t of jobTickets) {
        if (!t.id) continue;
        const existing = await jobTicketsRepository.getJobTicket(t.id);
        if (!existing) {
          await jobTicketsRepository.saveJobTicket(t);
          jobTicketsImported++;
        }
      }
    }

    // 5. Import Audit Logs
    if (Array.isArray(auditLogs)) {
      for (const l of auditLogs) {
        if (l.action && l.entityType && l.entityId) {
          await auditRepository.appendAuditLog(l);
          auditLogsImported++;
        }
      }
    }

    // 6. Import Notifications
    if (Array.isArray(notifications)) {
      for (const n of notifications) {
        if (n.recipientUserId && n.message) {
          await notificationsRepository.createNotification(n);
          notificationsImported++;
        }
      }
    }

    res.status(200).json({
      success: true,
      message: 'Data migration completed successfully into D1 database',
      results: {
        reportsImported,
        usersImported,
        artisansImported,
        jobTicketsImported,
        auditLogsImported,
        notificationsImported,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
