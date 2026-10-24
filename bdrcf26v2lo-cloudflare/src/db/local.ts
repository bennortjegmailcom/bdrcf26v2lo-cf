import { DatabaseSync } from 'node:sqlite';
import * as fs from 'fs';
import * as path from 'path';
import { setLocalDatabase } from './d1';

let localDb: any = null;

function getLocalDb() {
  if (!localDb) {
    const dbDir = path.resolve(process.cwd(), 'data');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    const dbPath = path.join(dbDir, 'bdr.sqlite');
    localDb = new DatabaseSync(dbPath);
    initTables(localDb);
  }
  return localDb;
}

function initTables(db: any) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      uid TEXT UNIQUE,
      name TEXT,
      email TEXT,
      role TEXT,
      roles TEXT,
      work_group TEXT,
      discipline TEXT,
      employee_number TEXT,
      shift TEXT,
      username TEXT,
      password_hash TEXT,
      pin_hash TEXT,
      webauthn_credential_id TEXT,
      is_approved INTEGER DEFAULT 1,
      notification_sound TEXT,
      hours_to_show INTEGER DEFAULT 72,
      last_login_at TEXT,
      last_auth_method TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS equipment (
      id TEXT PRIMARY KEY,
      name TEXT,
      equipment_number TEXT UNIQUE,
      work_group TEXT,
      area TEXT,
      criticality INTEGER DEFAULT 3,
      status TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      equipment TEXT,
      equipment_number TEXT,
      reported_fault TEXT,
      urgency INTEGER,
      reporting_time TEXT,
      status TEXT,
      work_group TEXT,
      details TEXT,
      operator_name TEXT,
      notification_number TEXT,
      reporter_id TEXT,
      reporter_name TEXT,
      reporter_employee_number TEXT,
      assigned_time TEXT,
      resolution_status TEXT,
      resolution_time TEXT,
      completed_time TEXT,
      data TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS job_tickets (
      id TEXT PRIMARY KEY,
      report_id TEXT,
      ticket_number TEXT UNIQUE,
      equipment TEXT,
      equipment_number TEXT,
      work_group TEXT,
      urgency INTEGER,
      status TEXT,
      lead_artisan_id TEXT,
      lead_artisan_name TEXT,
      data TEXT,
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS artisans (
      id TEXT PRIMARY KEY,
      name TEXT,
      responsibility TEXT,
      shift TEXT,
      employee_number TEXT,
      contact_number TEXT,
      specialty TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS lockouts (
      id TEXT PRIMARY KEY,
      equipment TEXT,
      equipment_number TEXT,
      work_group TEXT,
      status TEXT,
      lockout_time TEXT,
      booked_duration_minutes INTEGER,
      positive_test_result TEXT,
      data TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      timestamp TEXT,
      user_id TEXT,
      user_name TEXT,
      action TEXT,
      entity_type TEXT,
      entity_id TEXT,
      details TEXT,
      previous_hash TEXT,
      hash TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      recipient_user_id TEXT,
      message TEXT,
      related_report_id TEXT,
      is_read INTEGER DEFAULT 0,
      timestamp TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS sync_operations (
      operation_id TEXT PRIMARY KEY,
      result TEXT,
      updated_at TEXT
    );
  `);
}


export function enableLocalDatabase() {
  setLocalDatabase(() => ({
    prepare(query: string) {
      const stmt = getLocalDb().prepare(query);
      const bound = (args: any[]) => ({
        bind: (...values: any[]) => bound(values),
        async all() { return { results: stmt.all(...args) }; },
        async first() { return stmt.get(...args) || null; },
        async run() { return { success: true, meta: stmt.run(...args) }; },
      });
      return bound([]);
    },
  }));
}
