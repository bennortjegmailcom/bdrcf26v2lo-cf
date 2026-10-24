-- Cloudflare D1 Migration: 0001_initial_d1_schema.sql
-- Database: bdrcf (Binding: DB)
-- Target: Cloudflare D1 SQLite Engine

-- 1. Users and Authentication Profiles
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  uid TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  role TEXT NOT NULL,
  roles TEXT NOT NULL, -- JSON array of roles
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
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_uid ON users(uid);

-- 2. Breakdown Reports & Defect Tickets
CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  equipment TEXT NOT NULL,
  equipment_number TEXT NOT NULL,
  reported_fault TEXT NOT NULL,
  urgency INTEGER NOT NULL DEFAULT 3,
  reporting_time TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Active',
  work_group TEXT NOT NULL,
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
  data TEXT NOT NULL, -- Full JSON structure: assignments, changelog, comments, images
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_equipment_number ON reports(equipment_number);
CREATE INDEX IF NOT EXISTS idx_reports_reporting_time ON reports(reporting_time);
CREATE INDEX IF NOT EXISTS idx_reports_work_group ON reports(work_group);

-- 3. Job Tickets / Work Assignments
CREATE TABLE IF NOT EXISTS job_tickets (
  id TEXT PRIMARY KEY,
  report_id TEXT,
  ticket_number TEXT UNIQUE,
  equipment TEXT,
  equipment_number TEXT,
  work_group TEXT,
  urgency INTEGER,
  status TEXT NOT NULL DEFAULT 'OPEN',
  lead_artisan_id TEXT,
  lead_artisan_name TEXT,
  data TEXT NOT NULL, -- JSON with parts, steps, safety checks, isolation verification
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_job_tickets_report_id ON job_tickets(report_id);
CREATE INDEX IF NOT EXISTS idx_job_tickets_status ON job_tickets(status);

-- 4. Artisans Roster & Schedules
CREATE TABLE IF NOT EXISTS artisans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  responsibility TEXT NOT NULL,
  shift TEXT NOT NULL,
  employee_number TEXT,
  contact_number TEXT,
  specialty TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_artisans_shift ON artisans(shift);
CREATE INDEX IF NOT EXISTS idx_artisans_responsibility ON artisans(responsibility);

-- 5. Equipment Registry
CREATE TABLE IF NOT EXISTS equipment (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  equipment_number TEXT UNIQUE NOT NULL,
  work_group TEXT NOT NULL,
  area TEXT,
  criticality INTEGER DEFAULT 3,
  status TEXT DEFAULT 'OPERATIONAL',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_equipment_number ON equipment(equipment_number);
CREATE INDEX IF NOT EXISTS idx_equipment_work_group ON equipment(work_group);

-- 6. Lockout / Isolation Lifecycle & Positive Tests
CREATE TABLE IF NOT EXISTS lockouts (
  id TEXT PRIMARY KEY,
  equipment TEXT NOT NULL,
  equipment_number TEXT NOT NULL,
  work_group TEXT NOT NULL,
  status TEXT NOT NULL,
  lockout_time TEXT,
  booked_duration_minutes INTEGER,
  positive_test_result TEXT,
  data TEXT NOT NULL, -- JSON audit chain of SCADA stop, lock tags, test, handback
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_lockouts_status ON lockouts(status);
CREATE INDEX IF NOT EXISTS idx_lockouts_eq_number ON lockouts(equipment_number);

-- 7. Tamper-Proof Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  details TEXT,
  previous_hash TEXT,
  hash TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);

-- 8. Messages and Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  recipient_user_id TEXT NOT NULL,
  message TEXT NOT NULL,
  related_report_id TEXT,
  is_read INTEGER DEFAULT 0,
  timestamp TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_user_id, is_read);

-- 9. Shift Handovers & Operational Settings
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 10. Offline / Idempotent Sync Operations
CREATE TABLE IF NOT EXISTS sync_operations (
  operation_id TEXT PRIMARY KEY,
  result TEXT,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
