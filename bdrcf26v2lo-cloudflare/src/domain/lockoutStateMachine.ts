import { LockoutWorkflowStatus } from './types';

export class InvalidStateTransitionError extends Error {
  public currentState: LockoutWorkflowStatus;
  public requiredState?: string;

  constructor(message: string, currentState: LockoutWorkflowStatus, requiredState?: string) {
    super(message);
    this.name = 'InvalidStateTransitionError';
    this.currentState = currentState;
    this.requiredState = requiredState;
  }
}

export function validateTransition(
  currentState: LockoutWorkflowStatus,
  targetState: LockoutWorkflowStatus
): void {
  // Map legacy states to standard equivalents for verification logic
  let canonicalCurrent: LockoutWorkflowStatus = currentState;
  if (currentState === 'Locked' || currentState === 'PHYSICAL_LOCKOUT_CONFIRMED') {
    canonicalCurrent = 'LOCKOUT_ACTIVE';
  } else if (currentState === 'Returned') {
    canonicalCurrent = 'RELEASED';
  }

  // A repeated action must not overwrite evidence or create a second audit event.
  if (canonicalCurrent === targetState) {
    throw new InvalidStateTransitionError('This lockout step has already been completed.', currentState);
  }

  switch (targetState) {
    case 'LOCKOUT_REQUESTED':
      throw new InvalidStateTransitionError(
        'Cannot request an already initiated lockout.',
        currentState
      );

    case 'EQUIPMENT_CONFIRMED':
      if (canonicalCurrent !== 'LOCKOUT_REQUESTED') {
        throw new InvalidStateTransitionError(
          'Equipment confirmation requires the lockout to be in REQUESTED state.',
          currentState,
          'LOCKOUT_REQUESTED'
        );
      }
      break;

    case 'SCADA_STOP_CONFIRMED':
      if (canonicalCurrent !== 'EQUIPMENT_CONFIRMED') {
        throw new InvalidStateTransitionError(
          'SCADA stop confirmation requires the equipment to be CONFIRMED first.',
          currentState,
          'EQUIPMENT_CONFIRMED'
        );
      }
      break;

    case 'LOCKOUT_ACTIVE':
    case 'PHYSICAL_LOCKOUT_CONFIRMED':
      if (canonicalCurrent !== 'SCADA_STOP_CONFIRMED') {
        throw new InvalidStateTransitionError(
          'Physical lockout active state requires SCADA stop confirmation.',
          currentState,
          'SCADA_STOP_CONFIRMED'
        );
      }
      break;

    case 'POSITIVE_TEST_REQUESTED':
    case 'POSITIVE_TEST':
      if (canonicalCurrent !== 'LOCKOUT_ACTIVE') {
        throw new InvalidStateTransitionError(
          'A positive test can only be performed on an active lockout.',
          currentState,
          'LOCKOUT_ACTIVE'
        );
      }
      break;

    case 'POSITIVE_TEST_ACKNOWLEDGED':
      if (!['POSITIVE_TEST_REQUESTED', 'POSITIVE_TEST'].includes(canonicalCurrent)) {
        throw new InvalidStateTransitionError('Positive test acknowledgement requires a submitted test.', currentState);
      }
      break;

    case 'RELEASE_REQUESTED':
      if (canonicalCurrent !== 'POSITIVE_TEST_ACKNOWLEDGED') {
        throw new InvalidStateTransitionError(
          'Release request requires an acknowledged positive test.',
          currentState,
          'POSITIVE_TEST_ACKNOWLEDGED'
        );
      }
      break;

    case 'RELEASED':
    case 'Returned':
      if (canonicalCurrent !== 'RELEASE_REQUESTED') {
        throw new InvalidStateTransitionError(
          'Final release confirmation requires a release request first.',
          currentState,
          'RELEASE_REQUESTED'
        );
      }
      break;

    case 'REJECTED':
      const permitRejection = [
        'LOCKOUT_REQUESTED',
        'EQUIPMENT_CONFIRMED',
        'SCADA_STOP_CONFIRMED',
      ];
      if (!permitRejection.includes(canonicalCurrent)) {
        throw new InvalidStateTransitionError(
          `Lockout cannot be rejected from the current active stage.`,
          currentState,
          'LOCKOUT_REQUESTED / EQUIPMENT_CONFIRMED / SCADA_STOP_CONFIRMED'
        );
      }
      break;

    default:
      throw new InvalidStateTransitionError(
        `Unknown target state: ${targetState}`,
        currentState
      );
  }
}
