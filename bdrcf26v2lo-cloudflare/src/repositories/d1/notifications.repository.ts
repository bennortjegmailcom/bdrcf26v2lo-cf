import { getDb } from '../../db/d1';

export interface D1Notification {
  id: string;
  recipientUserId: string;
  message: string;
  relatedReportId?: string;
  isRead: boolean;
  timestamp: string;
}

export class D1NotificationsRepository {
  constructor(private env?: any) {}

  async listNotifications(userId?: string): Promise<D1Notification[]> {
    const db = getDb(this.env);
    let query = 'SELECT * FROM notifications ORDER BY timestamp DESC LIMIT 200';
    let rows: any[] = [];
    if (userId) {
      query = 'SELECT * FROM notifications WHERE recipient_user_id = ? ORDER BY timestamp DESC LIMIT 200';
      const { results } = await db.prepare(query).bind(userId).all();
      rows = results || [];
    } else {
      const { results } = await db.prepare(query).all();
      rows = results || [];
    }

    return rows.map(r => ({
      id: r.id,
      recipientUserId: r.recipient_user_id,
      message: r.message,
      relatedReportId: r.related_report_id || undefined,
      isRead: r.is_read === 1,
      timestamp: r.timestamp,
    }));
  }

  async createNotification(notif: Omit<D1Notification, 'id'>): Promise<D1Notification> {
    const db = getDb(this.env);
    const id = `notif-${Math.random().toString(36).substring(2, 10)}`;
    await db.prepare(`
      INSERT INTO notifications (id, recipient_user_id, message, related_report_id, is_read, timestamp, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      notif.recipientUserId,
      notif.message,
      notif.relatedReportId || '',
      notif.isRead ? 1 : 0,
      notif.timestamp || new Date().toISOString(),
      new Date().toISOString()
    ).run();

    return { ...notif, id };
  }

  async markAsRead(id: string): Promise<void> {
    const db = getDb(this.env);
    await db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').bind(id).run();
  }
}
