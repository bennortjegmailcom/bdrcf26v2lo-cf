export enum Role {
  REPORTER = 'Reporter',
  COORDINATOR = 'Coordinator',
  FOREMAN = 'Maintenance Shift Foreman',
  OPS_FOREMAN = 'Operations Shift Foreman',
  ADMIN = 'Admin',
  SCHEDULER = 'Scheduler',
  MECH_SUPERVISOR = 'Mechanical Supervisor',
  ELEC_SUPERVISOR = 'Electrical Supervisor',
  TECH_SUPERVISOR = 'Technical Supervisor',
  GUEST = 'Guest',
  INST_SUPERVISOR = 'Instrumentation Supervisor',
}

export const SCHEDULER_APPROVABLE_ROLES: Role[] = [
  Role.ADMIN,
  Role.SCHEDULER,
  Role.MECH_SUPERVISOR,
  Role.ELEC_SUPERVISOR,
  Role.TECH_SUPERVISOR,
  Role.INST_SUPERVISOR,
];

export interface WorkGroup {
  id: string;
  name: string;
  color?: string;
}export interface HandoverSection {
  id: string;
  name: string;
  targetRole?: Role;
  color?: string;
}

export enum Status {
  DRAFT = 'Draft',
  ACTIVE = 'Active',
  ASSIGNED = 'Assigned',
  RESOLVED = 'Resolved',
  COMPLETED = 'Completed',
}

export const DEFAULT_RESOLUTION_STATUSES = [
  { id: '1', name: 'Repaired and back in production' },
  { id: '2', name: 'Waiting for spares' },
  { id: '3', name: 'Given to dayshift' },
  { id: '4', name: 'Run but not repaired' },
  { id: '5', name: 'Hand Over' },
  { id: '6', name: 'Other' },
];

export interface ResolutionStatusItem {
  id: string;
  name: string;
  statusUrgText?: string;
  badgeColor?: string;
}

export interface Operator {
  id: string;
  name: string;
  shift: Shift;
  workGroup?: string;
  addedByUid?: string;
  employeeNumber?: string;
}

export type ResolutionStatus = string;

export enum Responsibility {
    ELECTRICIAN = 'Electrician',
    FITTER = 'Fitter',
    MILLWRIGHT = 'Millwright',
    INSTRUMENTATION = 'Instrumentation',
    PLATER = 'Plater',
    ARTISAN_AIDE = 'Artisan Aide',
    TECHNICIAN = 'Technician',
    OTHER = 'Other',
}

export enum Shift {
    A = 'A',
    B = 'B',
    C = 'C',
    D = 'D',
}

export interface User {
  id: string;
  name: string;
  role: Role;
  roles?: Role[];
  workGroup?: string;
  discipline?: string;
  employeeNumber?: string;
  shift?: Shift;
  username?: string;
  email?: string;
  password?: string;
  pin?: string;
  uid?: string;
  isApproved?: boolean;
  notificationSound?: string;
  hoursToShow?: number;
  acknowledgedMessages?: string[];
  authProvider?: 'local' | 'windows' | 'cloudflare';
  windowsDomain?: string;
  webAuthnCredentialId?: string;
  lastLoginAt?: string;
  lastAuthMethod?: 'windows_hello' | 'password' | 'pin' | 'cloudflare_zero_trust';
}

export interface Artisan {
  id: string;
  name: string;
  responsibility: Responsibility;
  shift: Shift;
  employeeNumber?: string;
}

export interface Assignment {
  artisanId: string;
  artisanName: string;
  responsibility: Responsibility;
  employeeNumber?: string;
  specialty?: string;
  contactNumber?: string;
}

export interface ChangeLogEntry {
  field: string;
  oldValue: string | number;
  newValue: string | number;
  timestamp: string;
  changedBy: string;
}

export interface Comment {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  timestamp: string;
  commentImage?: string;
}

export interface BreakdownReport {
  id: string;
  equipment: string;
  equipmentNumber: string;
  reportedFault: string;
  operatorName?: string | null;
  reportingTime: string;
  urgency: number;
  reporter: User;
  workGroup: string;
  status: Status;
  changeLog?: ChangeLogEntry[];
  comments?: Comment[];
  details?: string;
  defectImages?: string[];
  audioNote?: string;
  source?: 'field-report' | 'bdr-app';
  isFieldReport?: boolean;
  isDraft?: boolean;
  safetyConcern?: boolean;

  notificationNumber?: string;
  assignments?: Assignment[];
  assignedTime?: string;
  whatWasWrong?: string;
  resolutionStatus?: ResolutionStatus;
  resolutionNotes?: string;
  resolutionEmployeeNumber?: string;
  resolutionTime?: string;
  
  completedTime?: string;

  isNextShift?: boolean;
  nextShiftHighlightColor?: 'purple' | 'red' | 'orange' | 'green';
  dayshiftAcknowledged?: boolean;
  dayshiftAcknowledgedBy?: string;
  dayshiftAcknowledgedAt?: string;
  handoverSection?: string;
  sectionId?: string | null;
  sectionName?: string | null;
  responsibility?: Responsibility;
  handoverRecipientId?: string;
  handoverRecipientName?: string;
  handbackNotes?: string;
  handoverSafetyVerified?: boolean;
}

export interface FieldReportInput {
  reporterName: string;
  employeeNumber?: string;
  area: string;
  equipment: string;
  equipmentNumber: string;
  reportedFault: string;
  details?: string;
  urgency: number;
  safetyConcern?: boolean;
  defectImages?: string[];
  audioNote?: string;
}

export interface Notification {
  id: string;
  message: string;
  recipientUserId: string;
  relatedReportId?: string;
  relatedTicketId?: string;
  timestamp: string;
  isRead: boolean;
}

export interface UserMessage {
  id: string;
  senderId: string;
  senderName: string;
  category: string;
  content: string;
  timestamp: string;
  isReadByAdmin: boolean;
  wantsReply: boolean;
  adminReply?: string;
  isReplyReadByUser?: boolean;
  recipientType?: 'admin' | 'scheduler' | 'all' | 'role' | 'shift' | 'area' | 'individuals';
  targetRole?: string;
  targetShift?: string;
  targetArea?: string;
  targetUserIds?: string[];
  acknowledgedBy?: string[];
}

export type AppView = 'dashboard' | 'summary' | 'reports' | 'history' | 'about' | 'handover' | 'tickets' | 'meeting' | 'kanban' | 'gallery';

export type LockoutWorkflowStatus =
  | 'LOCKOUT_REQUESTED'
  | 'EQUIPMENT_CONFIRMED'
  | 'SCADA_STOP_CONFIRMED'
  | 'PHYSICAL_LOCKOUT_CONFIRMED'
  | 'LOCKOUT_ACTIVE'
  | 'POSITIVE_TEST_REQUESTED'
  | 'POSITIVE_TEST_ACKNOWLEDGED'
  | 'POSITIVE_TEST'
  | 'RELEASE_REQUESTED'
  | 'RELEASED'
  | 'REJECTED'
  | 'Locked'
  | 'Returned';

export type LockoutState = LockoutWorkflowStatus;

export interface JobTicket {
  id: string;
  equipment: string;
  equipmentNumber: string;
  workGroup?: string;
  workType?: string;
  sectionId?: string | null;
  sectionName?: string | null;
  relatedReportId?: string;
  status: LockoutWorkflowStatus;
  state?: LockoutWorkflowStatus; // Mirror alias for UI compatibility
  isLegacy?: boolean;

  // Stage 1: Request
  requestedByUserId?: string;
  requestedByUserName?: string;
  requestedByUserEmployeeNumber?: string;
  lockedByUserId?: string;
  lockedByUserName?: string;
  lockedByUserEmployeeNumber?: string;
  lockoutTime: string;
  bookedDurationMinutes: number | null;
  lockoutComments: string;

  // Stage 2: Equipment Confirmation
  equipmentConfirmedByUserId?: string;
  equipmentConfirmedByUserName?: string;
  equipmentConfirmedAt?: string;
  qrVerified?: boolean;

  // Stage 3: SCADA Stop Confirmation
  scadaConfirmedByUserId?: string;
  scadaConfirmedByUserName?: string;
  scadaEmployeeNumber?: string;
  scadaConfirmedAt?: string;
  scadaComments?: string;
  scadaVerificationType?: 'HUMAN_CONFIRMATION' | 'PLC_TELEMETRY';

  // Stage 4: Physical Lockout Confirmation
  physicalLockedByUserId?: string;
  physicalLockedByUserName?: string;
  physicalEmployeeNumber?: string;
  physicalLockedAt?: string;
  physicalLockoutComments?: string;

  // Stage 5: Positive Test
  positiveTestRecord?: {
    performedByUserId: string;
    performedByUserName: string;
    employeeNumber?: string;
    timestamp: string;
    result: 'PASS' | 'FAIL';
    comments: string;
  };
  positiveTestPerformedByUserId?: string;
  positiveTestPerformedByUserName?: string;
  positiveTestEmployeeNumber?: string;
  positiveTestAt?: string;
  positiveTestResult?: 'PASS' | 'FAIL';
  positiveTestComments?: string;

  // Stage 5b: Positive Test two-way acknowledgement (field <-> control room)
  positiveTestRequestedByUserId?: string;
  positiveTestRequestedByUserName?: string;
  positiveTestRequestedAt?: string;
  positiveTestCommunicationMethod?: 'APP' | 'ALTERNATIVE';
  positiveTestAcknowledgedByUserId?: string;
  positiveTestAcknowledgedByUserName?: string;
  positiveTestAcknowledgedAt?: string;
  positiveTestAcknowledgedComments?: string;
  positiveTestAckMethod?: 'APP' | 'ALTERNATIVE';

  // Stage 6: Release Request
  releaseRequestedByUserId?: string;
  releaseRequestedByUserName?: string;
  releaseRequestedAt?: string;
  releaseRequestComments?: string;

  // Stage 7: Release / Handback
  releasedByUserId?: string;
  releasedByUserName?: string;
  releasedEmployeeNumber?: string;
  unlockTime?: string;
  unlockComments?: string;
  testSuccessful?: boolean;
  returnedByUserId?: string;
  returnedByUserName?: string;
  returnedByUserEmployeeNumber?: string;

  // Rejection
  rejectedByUserId?: string;
  rejectedByUserName?: string;
  rejectedAt?: string;
  rejectionReason?: string;
}

export type AppPermission =
  | 'admin:access'
  | 'report:create'
  | 'report:assign'
  | 'report:resolve'
  | 'report:complete'
  | 'report:handover_ack'
  | 'report:approve_draft'
  | 'lockout:request'
  | 'lockout:scada_confirm'
  | 'lockout:physical_lock'
  | 'lockout:positive_test'
  | 'lockout:release';

export interface LockoutAuditEvent {
  id?: string;
  ticketId: string;
  reportId?: string;
  equipment: string;
  equipmentNumber: string;
  userId: string;
  userName: string;
  employeeNumber?: string;
  action: 'REQUEST_LOCKOUT' | 'CONFIRM_EQUIPMENT' | 'CONFIRM_SCADA_STOP' | 'CONFIRM_PHYSICAL_LOCKOUT' | 'POSITIVE_TEST' | 'REQUEST_POSITIVE_TEST' | 'ACKNOWLEDGE_POSITIVE_TEST' | 'REQUEST_RELEASE' | 'RELEASE_LOCKOUT' | 'REJECT_LOCKOUT';
  previousState: LockoutWorkflowStatus | 'NONE';
  newState: LockoutWorkflowStatus;
  comments?: string;
  timestamp: string;
  sequenceNumber?: number;
  previousHash?: string;
  hash?: string;
  tamperEvidentChecksum?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  entityType: string;
  entityId: string;
  details: string;
  sequenceNumber?: number;
  previousHash?: string;
  hash?: string;
  tamperEvidentChecksum?: string;
}
