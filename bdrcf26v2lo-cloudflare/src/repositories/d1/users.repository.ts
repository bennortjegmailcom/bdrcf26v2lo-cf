import { IUsersRepository } from '../interfaces/users.repository.interface';
import { User, Role } from '../../domain/types';
import { getDb } from '../../db/d1';

export class D1UsersRepository implements IUsersRepository {
  constructor(private env?: any) {}

  async getUserByUid(uid: string): Promise<User | null> {
    const db = getDb(this.env);
    const row = await db.prepare('SELECT * FROM users WHERE uid = ? LIMIT 1').bind(uid).first();
    if (!row) return null;
    return this.mapUserRow(row);
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const row = await getDb(this.env).prepare('SELECT * FROM users WHERE lower(email) = ? LIMIT 1').bind(email.toLowerCase()).first();
    return row ? this.mapUserRow(row) : null;
  }

  async getUserById(id: string): Promise<User | null> {
    const db = getDb(this.env);
    const row = await db.prepare('SELECT * FROM users WHERE id = ? OR uid = ? LIMIT 1').bind(id, id).first();
    if (!row) return null;
    return this.mapUserRow(row);
  }

  async listUsers(): Promise<User[]> {
    const db = getDb(this.env);
    const { results } = await db.prepare('SELECT * FROM users ORDER BY name ASC').all();
    if (!results) return [];
    return results.map((row: any) => this.mapUserRow(row));
  }

  private mapUserRow(row: any): User {
    return {
      id: row.id as string,
      uid: row.uid as string,
      name: row.name as string,
      email: row.email as string,
      role: row.role as Role,
      roles: row.roles ? JSON.parse(row.roles as string) : [row.role as Role],
      employeeNumber: (row.employee_number as string) || undefined,
      workGroup: (row.work_group as string) || undefined,
      discipline: (row.discipline as string) || undefined,
      shift: (row.shift as any) || undefined,
      username: (row.username as string) || undefined,
      isApproved: row.is_approved === 1 || row.is_approved === null,
      hoursToShow: row.hours_to_show ? Number(row.hours_to_show) : 72,
      notificationSound: (row.notification_sound as string) || undefined,
      lastLoginAt: (row.last_login_at as string) || undefined,
      lastAuthMethod: (row.last_auth_method as any) || undefined,
      webAuthnCredentialId: (row.webauthn_credential_id as string) || undefined,
    };
  }

  async saveUser(user: User): Promise<void> {
    const db = getDb(this.env);
    await db.prepare(`
      INSERT INTO users (
        id, uid, name, email, role, roles, work_group, discipline, employee_number, shift,
        username, webauthn_credential_id, is_approved, notification_sound, hours_to_show,
        last_login_at, last_auth_method, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(uid) DO UPDATE SET
        name = excluded.name,
        email = excluded.email,
        role = excluded.role,
        roles = excluded.roles,
        work_group = excluded.work_group,
        discipline = excluded.discipline,
        employee_number = excluded.employee_number,
        shift = excluded.shift,
        username = excluded.username,
        webauthn_credential_id = excluded.webauthn_credential_id,
        is_approved = excluded.is_approved,
        notification_sound = excluded.notification_sound,
        hours_to_show = excluded.hours_to_show,
        last_login_at = excluded.last_login_at,
        last_auth_method = excluded.last_auth_method
    `).bind(
      user.id || user.uid,
      user.uid,
      user.name,
      user.email || '',
      user.role,
      JSON.stringify(user.roles || [user.role]),
      user.workGroup || '',
      user.discipline || '',
      user.employeeNumber || '',
      user.shift || '',
      user.username || '',
      user.webAuthnCredentialId || '',
      user.isApproved === false ? 0 : 1,
      user.notificationSound || '',
      user.hoursToShow || 72,
      user.lastLoginAt || new Date().toISOString(),
      user.lastAuthMethod || '',
      new Date().toISOString()
    ).run();
  }

  async deleteUser(id: string): Promise<void> {
    const db = getDb(this.env);
    await db.prepare('DELETE FROM users WHERE id = ? OR uid = ?').bind(id, id).run();
  }
}

