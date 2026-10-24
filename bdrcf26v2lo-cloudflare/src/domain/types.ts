export {
  Role,
  Shift,
  Status,
  Responsibility,
} from '../../types';

export type {
  User,
  Artisan,
  Assignment,
  ChangeLogEntry,
  Comment,
  WorkGroup,
  ResolutionStatusItem,
  Operator,
} from '../../types';


export interface Equipment {
  id: string;
  name: string;
  equipmentNumber: string;
  workGroup?: string;
  status?: string;
}

export interface BreakdownReport {
  id: string;
  equipment: string;
  equipmentNumber: string;
  reportedFault: string;
  urgency: number;
  reportingTime: string;
  status: string;
  workGroup: string;
  reporter: {
    id: string;
    name: string;
    role: string;
    employeeNumber?: string;
    workGroup?: string;
    shift?: string;
  };
  details?: string;
  operatorName?: string;
  defectImages?: string[];
  audioNote?: string;
  source?: 'field-report' | 'bdr-app';
  isFieldReport?: boolean;
  isDraft?: boolean;
  safetyConcern?: boolean;
  changeLog?: string[];
  assignments?: Array<{
    artisanId: string;
    artisanName: string;
    assignedAt: string;
    assignedByUserId: string;
    assignedByUserName: string;
  }>;
  assignedTime?: string;
  whatWasWrong?: string;
  resolutionStatus?: string;
  resolutionTime?: string;
  completedTime?: string;
  handoverSection?: string;
  handoverRecipientId?: string;
  handoverRecipientName?: string;
  handbackNotes?: string;
  handoverSafetyVerified?: boolean;
  dayshiftAcknowledged?: boolean;
  dayshiftAcknowledgedBy?: string;
  dayshiftAcknowledgedAt?: string;
  isNextShift?: boolean;
}

export type LockoutWorkflowStatus =
  | 'LOCKOUT_REQUESTED'
  | 'EQUIPMENT_CONFIRMED'
  | 'SCADA_STOP_CONFIRMED'
  | 'PHYSICAL_LOCKOUT_CONFIRMED' // legacy/compatibility
  | 'LOCKOUT_ACTIVE'
  | 'POSITIVE_TEST_REQUESTED'
  | 'POSITIVE_TEST_ACKNOWLEDGED'
  | 'POSITIVE_TEST'
  | 'RELEASE_REQUESTED'
  | 'RELEASED'
  | 'REJECTED'
  | 'Locked'   // legacy
  | 'Returned'; // legacy

export type LockoutState = LockoutWorkflowStatus;

export interface LockoutConfirmationRecord {
  userId: string; // Deprecated, use recordedByUserId
  userName: string; // Deprecated, use recordedByUserName
  employeeNumber?: string;
  timestamp: string; // Deprecated, use recordedAt
  comments?: string;
  // Clarification fields
  recordedByUserId?: string;
  recordedByUserName?: string;
  recordedAt?: string;
  confirmedByName?: string;
  confirmedByEmployeeNumber?: string;
  confirmationMethod?: 'IN_PERSON' | 'RADIO' | 'PHONE' | 'VERBAL' | 'QR' | 'SCADA_OBSERVATION' | 'OTHER';
}

export interface JobTicket {
  id: string;
  equipment: string;
  equipmentNumber: string;
  workGroup?: string;
  workType?: string;
  relatedReportId?: string;
  status: LockoutWorkflowStatus;
  state?: LockoutWorkflowStatus; // Mirror/alias
  isLegacy?: boolean;
  auditEvents?: LockoutAuditEvent[];

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
  equipmentConfirmed?: boolean;
  equipmentConfirmation?: LockoutConfirmationRecord & {
    verifiedViaQR?: boolean;
    scannedQrCode?: string;
  };
  equipmentConfirmedByUserId?: string;
  equipmentConfirmedByUserName?: string;
  equipmentConfirmedAt?: string;
  qrVerified?: boolean;

  // Stage 3: SCADA Stop Confirmation
  scadaStopConfirmation?: LockoutConfirmationRecord;
  scadaConfirmedByUserId?: string;
  scadaConfirmedByUserName?: string;
  scadaEmployeeNumber?: string;
  scadaConfirmedAt?: string;
  scadaComments?: string;
  scadaVerificationType?: 'HUMAN_CONFIRMATION' | 'PLC_TELEMETRY';

  // Stage 4: Physical Lockout Confirmation
  physicalLockoutConfirmation?: LockoutConfirmationRecord & {
    isolationPoints?: string[];
  };
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
  releaseRequestRecord?: {
    requestedByUserId: string;
    requestedByUserName: string;
    employeeNumber?: string;
    timestamp: string;
    comments: string;
    recordedByUserId?: string;
    recordedByUserName?: string;
    recordedAt?: string;
    confirmedByName?: string;
    confirmedByEmployeeNumber?: string;
    confirmationMethod?: string;
  };
  releaseRequestedByUserId?: string;
  releaseRequestedByUserName?: string;
  releaseRequestedAt?: string;
  releaseRequestComments?: string;

  // Stage 7: Release / Handback
  releaseRecord?: {
    releasedByUserId: string;
    releasedByUserName: string;
    employeeNumber?: string;
    timestamp: string;
    comments: string;
    recordedByUserId?: string;
    recordedByUserName?: string;
    recordedAt?: string;
    confirmedByName?: string;
    confirmedByEmployeeNumber?: string;
    confirmationMethod?: string;
  };
  releasedByUserId?: string;
  releasedByUserName?: string;
  releasedEmployeeNumber?: string;
  unlockTime?: string;
  unlockComments?: string;
  testSuccessful?: boolean;
  returnedByUserId?: string;
  returnedByUserName?: string;
  returnedByUserEmployeeNumber?: string;

  // Rejection Record
  rejectionRecord?: {
    rejectedByUserId: string;
    rejectedByUserName: string;
    employeeNumber?: string;
    reason: string;
    timestamp: string;
    recordedByUserId?: string;
    recordedByUserName?: string;
    recordedAt?: string;
    confirmedByName?: string;
    confirmedByEmployeeNumber?: string;
    confirmationMethod?: string;
  };
  rejectedByUserId?: string;
  rejectedByUserName?: string;
  rejectedAt?: string;
  rejectionReason?: string;
}

export interface LockoutAuditEvent {
  id?: string;
  ticketId: string;
  reportId?: string;
  equipment: string;
  equipmentNumber: string;
  userId: string;
  userName: string;
  employeeNumber?: string;
  action: 'REQUEST_POSITIVE_TEST' | 'ACKNOWLEDGE_POSITIVE_TEST' | 'REQUEST_LOCKOUT' | 'CONFIRM_EQUIPMENT' | 'CONFIRM_SCADA_STOP' | 'CONFIRM_PHYSICAL_LOCKOUT' | 'POSITIVE_TEST' | 'REQUEST_RELEASE' | 'RELEASE_LOCKOUT' | 'REJECT_LOCKOUT';
  previousState: LockoutWorkflowStatus | 'NONE';
  newState: LockoutWorkflowStatus;
  comments?: string;
  timestamp: string;
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
}

export interface UserMessage {
  id: string;
  senderId: string;
  senderName: string;
  message: string;
  timestamp: string;
  recipientRole?: string;
  isBroadcast?: boolean;
  acknowledgedBy?: string[];
  adminReply?: string;
  isReplyReadByUser?: boolean;
}
