import { ILockoutsRepository } from '../repositories/interfaces/lockouts.repository.interface';
import { JobTicket, LockoutAuditEvent, LockoutWorkflowStatus, User, LockoutConfirmationRecord } from '../domain/types';
import { validateTransition } from '../domain/lockoutStateMachine';
import { NotFoundError, ConflictError } from '../errors/api.error';

export class LockoutService {
  constructor(private lockoutsRepo: ILockoutsRepository) {}

  async getLockout(id: string): Promise<JobTicket> {
    const lockout = await this.lockoutsRepo.getLockout(id);
    if (!lockout) {
      throw new NotFoundError(`Lockout ticket with ID '${id}' not found`);
    }
    return lockout;
  }

  async listLockouts(): Promise<JobTicket[]> {
    return this.lockoutsRepo.listLockouts();
  }

  private createAuditLog(
    ticket: JobTicket,
    user: User,
    action: LockoutAuditEvent['action'],
    previousState: LockoutWorkflowStatus | 'NONE',
    newState: LockoutWorkflowStatus,
    comments?: string
  ): LockoutAuditEvent {
    return {
      ticketId: ticket.id,
      reportId: ticket.relatedReportId || undefined,
      equipment: ticket.equipment,
      equipmentNumber: ticket.equipmentNumber,
      userId: user.id,
      userName: user.name,
      employeeNumber: user.employeeNumber || undefined,
      action,
      previousState,
      newState,
      comments,
      timestamp: new Date().toISOString(),
    };
  }

  async requestLockout(
    currentUser: User,
    data: {
      equipment: string;
      equipmentNumber: string;
      workGroup: string;
      workType?: string;
      relatedReportId?: string;
      bookedDurationMinutes: number | null;
      lockoutComments: string;
    },
    operationId?: string
  ): Promise<JobTicket> {
    const now = new Date().toISOString();
    const status: LockoutWorkflowStatus = 'LOCKOUT_REQUESTED';

    const ticketPayload: Omit<JobTicket, 'id'> = {
      equipment: data.equipment,
      equipmentNumber: data.equipmentNumber,
      workGroup: data.workGroup,
      workType: data.workType || 'Breakdown / Unplanned Repair',
      relatedReportId: data.relatedReportId,
      status,
      state: status,
      requestedByUserId: currentUser.id,
      requestedByUserName: currentUser.name,
      requestedByUserEmployeeNumber: currentUser.employeeNumber,
      lockedByUserId: currentUser.id,
      lockedByUserName: currentUser.name,
      lockedByUserEmployeeNumber: currentUser.employeeNumber,
      lockoutTime: now,
      bookedDurationMinutes: data.bookedDurationMinutes,
      lockoutComments: data.lockoutComments,
    };

    const ticket = await this.lockoutsRepo.createLockout(ticketPayload, operationId);

    // Create sync audit and initial notifications
    const audit: LockoutAuditEvent = {
      ticketId: ticket.id,
      reportId: data.relatedReportId,
      equipment: data.equipment,
      equipmentNumber: data.equipmentNumber,
      userId: currentUser.id,
      userName: currentUser.name,
      employeeNumber: currentUser.employeeNumber,
      action: 'REQUEST_LOCKOUT',
      previousState: 'NONE',
      newState: status,
      comments: data.lockoutComments,
      timestamp: now,
    };

    return ticket;
  }

  async confirmEquipment(
    ticketId: string,
    currentUser: User,
    data: { employeeNumber?: string; qrVerified?: boolean; scannedQrCode?: string; confirmationMethod?: LockoutConfirmationRecord['confirmationMethod'] }
  ): Promise<JobTicket> {
    const ticket = await this.getLockout(ticketId);
    const now = new Date().toISOString();
    const targetState: LockoutWorkflowStatus = 'EQUIPMENT_CONFIRMED';

    validateTransition(ticket.status, targetState);

    const empNumber = data.employeeNumber || currentUser.employeeNumber || '';
    const confirmation: LockoutConfirmationRecord & { verifiedViaQR?: boolean; scannedQrCode?: string } = {
      userId: currentUser.id,
      userName: currentUser.name,
      employeeNumber: empNumber,
      timestamp: now,
      comments: data.qrVerified ? `Verified via QR tag: ${data.scannedQrCode}` : 'Verified via visual identification',
      verifiedViaQR: data.qrVerified,
      scannedQrCode: data.scannedQrCode,
      recordedByUserId: currentUser.id,
      recordedByUserName: currentUser.name,
      recordedAt: now,
      confirmedByName: currentUser.name,
      confirmedByEmployeeNumber: empNumber,
      confirmationMethod: data.confirmationMethod || 'OTHER',
    };

    const updates: Partial<JobTicket> = {
      status: targetState,
      state: targetState,
      equipmentConfirmed: true,
      equipmentConfirmation: confirmation,
      equipmentConfirmedByUserId: currentUser.id,
      equipmentConfirmedByUserName: currentUser.name,
      equipmentConfirmedAt: now,
      qrVerified: data.qrVerified,
    };

    const audit = this.createAuditLog(
      ticket,
      currentUser,
      'CONFIRM_EQUIPMENT',
      ticket.status,
      targetState,
      confirmation.comments
    );

    return this.lockoutsRepo.updateLockoutWithAudit(ticketId, updates, audit);
  }

  async confirmScadaStop(
    ticketId: string,
    currentUser: User,
    data: { employeeNumber: string; comments: string; confirmationMethod?: LockoutConfirmationRecord['confirmationMethod'] }
  ): Promise<JobTicket> {
    const ticket = await this.getLockout(ticketId);
    const now = new Date().toISOString();
    const targetState: LockoutWorkflowStatus = 'SCADA_STOP_CONFIRMED';

    validateTransition(ticket.status, targetState);

    const method = data.confirmationMethod || 'VERBAL';
    const confirmation: LockoutConfirmationRecord = {
      userId: currentUser.id,
      userName: currentUser.name,
      employeeNumber: data.employeeNumber,
      timestamp: now,
      comments: data.comments,
      recordedByUserId: currentUser.id,
      recordedByUserName: currentUser.name,
      recordedAt: now,
      confirmedByName: currentUser.name,
      confirmedByEmployeeNumber: data.employeeNumber,
      confirmationMethod: method,
    };

    const updates: Partial<JobTicket> = {
      status: targetState,
      state: targetState,
      scadaStopConfirmation: confirmation,
      scadaConfirmedByUserId: currentUser.id,
      scadaConfirmedByUserName: currentUser.name,
      scadaEmployeeNumber: data.employeeNumber,
      scadaConfirmedAt: now,
      scadaComments: data.comments,
      scadaVerificationType: 'HUMAN_CONFIRMATION',
    };

    const audit = this.createAuditLog(
      ticket,
      currentUser,
      'CONFIRM_SCADA_STOP',
      ticket.status,
      targetState,
      data.comments
    );

    return this.lockoutsRepo.updateLockoutWithAudit(ticketId, updates, audit);
  }

  async confirmPhysicalLockout(
    ticketId: string,
    currentUser: User,
    data: { employeeNumber: string; comments: string; isolationPoints?: string[]; confirmationMethod?: LockoutConfirmationRecord['confirmationMethod'] }
  ): Promise<JobTicket> {
    const ticket = await this.getLockout(ticketId);
    const now = new Date().toISOString();
    const targetState: LockoutWorkflowStatus = 'LOCKOUT_ACTIVE';

    validateTransition(ticket.status, targetState);

    const method = data.confirmationMethod || 'IN_PERSON';
    const confirmation: LockoutConfirmationRecord & { isolationPoints?: string[] } = {
      userId: currentUser.id,
      userName: currentUser.name,
      employeeNumber: data.employeeNumber,
      timestamp: now,
      recordedByUserId: currentUser.id,
      recordedByUserName: currentUser.name,
      recordedAt: now,
      confirmedByName: currentUser.name,
      confirmedByEmployeeNumber: data.employeeNumber,
      confirmationMethod: method,
      isolationPoints: data.isolationPoints,
    };

    const updates: Partial<JobTicket> = {
      status: targetState,
      state: targetState,
      physicalLockoutConfirmation: confirmation,
      physicalLockedByUserId: currentUser.id,
      physicalLockedByUserName: currentUser.name,
      physicalEmployeeNumber: data.employeeNumber,
      physicalLockedAt: now,
      physicalLockoutComments: data.comments,
    };

    const audit = this.createAuditLog(
      ticket,
      currentUser,
      'CONFIRM_PHYSICAL_LOCKOUT',
      ticket.status,
      targetState,
      data.comments
    );

    const updated = await this.lockoutsRepo.updateLockoutWithAudit(ticketId, updates, audit);

    return updated;
  }

  async recordPositiveTest(
    ticketId: string,
    currentUser: User,
    data: { employeeNumber: string; result: 'PASS' | 'FAIL'; comments: string; confirmationMethod?: LockoutConfirmationRecord['confirmationMethod'] }
  ): Promise<JobTicket> {
    const ticket = await this.getLockout(ticketId);
    const now = new Date().toISOString();
    const targetState: LockoutWorkflowStatus = 'POSITIVE_TEST';

    validateTransition(ticket.status, targetState);

    const updates: Partial<JobTicket> = {
      status: targetState,
      state: targetState,
      positiveTestRecord: {
        performedByUserId: currentUser.id,
        performedByUserName: currentUser.name,
        employeeNumber: data.employeeNumber,
        timestamp: now,
        result: data.result,
        comments: data.comments,
      },
      positiveTestPerformedByUserId: currentUser.id,
      positiveTestPerformedByUserName: currentUser.name,
      positiveTestEmployeeNumber: data.employeeNumber,
      positiveTestAt: now,
      positiveTestResult: data.result,
      positiveTestComments: data.comments,
    };

    const audit = this.createAuditLog(
      ticket,
      currentUser,
      'POSITIVE_TEST',
      ticket.status,
      targetState,
      `Result: ${data.result}. Comments: ${data.comments}`
    );

    return this.lockoutsRepo.updateLockoutWithAudit(ticketId, updates, audit);
  }

  async requestPositiveTest(ticketId: string, currentUser: User, data: { employeeNumber: string; result: 'PASS' | 'FAIL'; comments: string }): Promise<JobTicket> {
    const ticket = await this.getLockout(ticketId);
    validateTransition(ticket.status, 'POSITIVE_TEST_REQUESTED');
    const now = new Date().toISOString();
    return this.lockoutsRepo.updateLockoutWithAudit(ticketId, {
      status: 'POSITIVE_TEST_REQUESTED', state: 'POSITIVE_TEST_REQUESTED',
      positiveTestRecord: { performedByUserId: currentUser.id, performedByUserName: currentUser.name, employeeNumber: data.employeeNumber, timestamp: now, result: data.result, comments: data.comments },
      positiveTestResult: data.result, positiveTestComments: data.comments,
      positiveTestRequestedByUserId: currentUser.id, positiveTestRequestedByUserName: currentUser.name,
      positiveTestRequestedAt: now, positiveTestCommunicationMethod: 'APP',
    }, this.createAuditLog(ticket, currentUser, 'REQUEST_POSITIVE_TEST', ticket.status, 'POSITIVE_TEST_REQUESTED', data.comments));
  }

  async acknowledgePositiveTest(ticketId: string, currentUser: User, data: { employeeNumber: string; comments: string; method: 'APP' | 'ALTERNATIVE'; result?: 'PASS' | 'FAIL' }): Promise<JobTicket> {
    const ticket = await this.getLockout(ticketId);
    validateTransition(ticket.status, 'POSITIVE_TEST_ACKNOWLEDGED');
    if (data.method === 'APP' && !ticket.positiveTestResult) throw new Error('No field test is awaiting acknowledgement');
    const result = ticket.positiveTestResult || data.result;
    if (!result) throw new Error('A positive test result is required');
    return this.lockoutsRepo.updateLockoutWithAudit(ticketId, {
      status: 'POSITIVE_TEST_ACKNOWLEDGED', state: 'POSITIVE_TEST_ACKNOWLEDGED', positiveTestResult: result,
      positiveTestAcknowledgedByUserId: currentUser.id, positiveTestAcknowledgedByUserName: currentUser.name,
      positiveTestAcknowledgedAt: new Date().toISOString(), positiveTestAcknowledgedComments: data.comments,
      positiveTestAckMethod: data.method,
    }, this.createAuditLog(ticket, currentUser, 'ACKNOWLEDGE_POSITIVE_TEST', ticket.status, 'POSITIVE_TEST_ACKNOWLEDGED', data.comments));
  }

  async requestRelease(
    ticketId: string,
    currentUser: User,
    data: { employeeNumber: string; comments: string; confirmationMethod?: LockoutConfirmationRecord['confirmationMethod'] }
  ): Promise<JobTicket> {
    const ticket = await this.getLockout(ticketId);
    const now = new Date().toISOString();
    const targetState: LockoutWorkflowStatus = 'RELEASE_REQUESTED';

    validateTransition(ticket.status, targetState);
    if (!ticket.equipmentConfirmation || !ticket.scadaStopConfirmation || !ticket.physicalLockoutConfirmation ||
        ticket.positiveTestResult !== 'PASS' || !ticket.positiveTestAcknowledgedAt) {
      throw new ConflictError('Equipment, SCADA, physical isolation, and an acknowledged passing positive test are required before release.');
    }

    const method = data.confirmationMethod || 'IN_PERSON';
    const updates: Partial<JobTicket> = {
      status: targetState,
      state: targetState,
      releaseRequestRecord: {
        requestedByUserId: currentUser.id,
        requestedByUserName: currentUser.name,
        employeeNumber: data.employeeNumber,
        timestamp: now,
        comments: data.comments,
        recordedByUserId: currentUser.id,
        recordedByUserName: currentUser.name,
        recordedAt: now,
        confirmedByName: currentUser.name,
        confirmedByEmployeeNumber: data.employeeNumber,
        confirmationMethod: method,
      },
      releaseRequestedByUserId: currentUser.id,
      releaseRequestedByUserName: currentUser.name,
      releaseRequestedAt: now,
      releaseRequestComments: data.comments,
    };

    const audit = this.createAuditLog(
      ticket,
      currentUser,
      'REQUEST_RELEASE',
      ticket.status,
      targetState,
      data.comments
    );

    return this.lockoutsRepo.updateLockoutWithAudit(ticketId, updates, audit);
  }

  async confirmRelease(
    ticketId: string,
    currentUser: User,
    data: { employeeNumber: string; comments: string; confirmationMethod?: LockoutConfirmationRecord['confirmationMethod'] }
  ): Promise<JobTicket> {
    const ticket = await this.getLockout(ticketId);
    const now = new Date().toISOString();
    const targetState: LockoutWorkflowStatus = 'RELEASED';

    validateTransition(ticket.status, targetState);
    if (!ticket.releaseRequestRecord || ticket.positiveTestResult !== 'PASS' || !ticket.positiveTestAcknowledgedAt) {
      throw new ConflictError('Release request and an acknowledged passing positive test are required.');
    }

    const method = data.confirmationMethod || 'IN_PERSON';
    const updates: Partial<JobTicket> = {
      status: targetState,
      state: targetState,
      releaseRecord: {
        releasedByUserId: currentUser.id,
        releasedByUserName: currentUser.name,
        employeeNumber: data.employeeNumber,
        timestamp: now,
        comments: data.comments,
        recordedByUserId: currentUser.id,
        recordedByUserName: currentUser.name,
        recordedAt: now,
        confirmedByName: currentUser.name,
        confirmedByEmployeeNumber: data.employeeNumber,
        confirmationMethod: method,
      },
      releasedByUserId: currentUser.id,
      releasedByUserName: currentUser.name,
      releasedEmployeeNumber: data.employeeNumber,
      unlockTime: now,
      unlockComments: data.comments,
      testSuccessful: true,
      returnedByUserId: currentUser.id,
      returnedByUserName: currentUser.name,
      returnedByUserEmployeeNumber: data.employeeNumber,
    };

    const audit = this.createAuditLog(
      ticket,
      currentUser,
      'RELEASE_LOCKOUT',
      ticket.status,
      targetState,
      data.comments
    );

    return this.lockoutsRepo.updateLockoutWithAudit(ticketId, updates, audit);
  }

  async rejectLockout(
    ticketId: string,
    currentUser: User,
    data: { employeeNumber: string; reason: string; confirmationMethod?: LockoutConfirmationRecord['confirmationMethod'] }
  ): Promise<JobTicket> {
    const ticket = await this.getLockout(ticketId);
    const now = new Date().toISOString();
    const targetState: LockoutWorkflowStatus = 'REJECTED';

    validateTransition(ticket.status, targetState);

    const updates: Partial<JobTicket> = {
      status: targetState,
      state: targetState,
      rejectionRecord: {
        rejectedByUserId: currentUser.id,
        rejectedByUserName: currentUser.name,
        employeeNumber: data.employeeNumber,
        reason: data.reason,
        timestamp: now,
      },
      rejectedByUserId: currentUser.id,
      rejectedByUserName: currentUser.name,
      rejectedAt: now,
      rejectionReason: data.reason,
    };

    const audit = this.createAuditLog(
      ticket,
      currentUser,
      'REJECT_LOCKOUT',
      ticket.status,
      targetState,
      data.reason
    );

    return this.lockoutsRepo.updateLockoutWithAudit(ticketId, updates, audit);
  }
}
