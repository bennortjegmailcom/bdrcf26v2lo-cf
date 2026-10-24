import { ISyncRepository } from '../repositories/interfaces/sync.repository.interface';
import { ReportsService } from './reports.service';
import { LockoutService } from './lockout.service';
import { User } from '../domain/types';
import { createReportSchema, createLockoutSchema } from '../validation/schemas';
import { createHash } from 'node:crypto';
import { Role } from '../domain/types';

export interface SyncOperation {
  operationId: string;
  type: 'CREATE_REPORT' | 'REQUEST_LOCKOUT';
  payload: any;
}

export interface SyncResult {
  operationId: string;
  status: 'SUCCESS' | 'FAILED';
  result?: any;
  error?: string;
}

export class SyncService {
  constructor(
    private syncRepo: ISyncRepository,
    private reportsService: ReportsService,
    private lockoutService: LockoutService
  ) {}

  async processSync(currentUser: User, operations: SyncOperation[]): Promise<SyncResult[]> {
    const results: SyncResult[] = [];

    for (const op of operations) {
      try {
        const scopedKey = `${currentUser.id}:${op.operationId}`;
        const stableId = `sync-${createHash('sha256').update(scopedKey).digest('hex')}`;
        // 1. Check idempotency: Has this operationId been successfully processed already?
        const cachedResult = await this.syncRepo.getSavedSyncOperation(scopedKey);
        if (cachedResult) {
          results.push({
            operationId: op.operationId,
            status: 'SUCCESS',
            result: cachedResult,
          });
          continue;
        }

        // 2. Validate inner sync payload against corresponding schemas to prevent invalid submissions
        let opResult: any;
        if (op.type === 'CREATE_REPORT') {
          const parsed = createReportSchema.safeParse(op.payload);
          if (!parsed.success) {
            throw new Error(`Validation failed: ${JSON.stringify(parsed.error.format())}`);
          }
          opResult = await this.reportsService.createReport(currentUser, parsed.data, stableId);
        } else if (op.type === 'REQUEST_LOCKOUT') {
          if (![Role.ADMIN, Role.FOREMAN, Role.MECH_SUPERVISOR, Role.ELEC_SUPERVISOR, Role.TECH_SUPERVISOR, Role.INST_SUPERVISOR].includes(currentUser.role)) {
            throw new Error('Lockout permission required');
          }
          const parsed = createLockoutSchema.safeParse(op.payload);
          if (!parsed.success) {
            throw new Error(`Validation failed: ${JSON.stringify(parsed.error.format())}`);
          }
          opResult = await this.lockoutService.requestLockout(currentUser, parsed.data, stableId);
        } else {
          throw new Error(`Unsupported sync operation type: ${op.type}`);
        }

        // 3. Persist success state atomically for idempotency
        await this.syncRepo.saveSyncOperation(scopedKey, opResult);

        results.push({
          operationId: op.operationId,
          status: 'SUCCESS',
          result: opResult,
        });
      } catch (err: any) {
        console.error(`Sync operation ${op.operationId} failed:`, err);
        results.push({
          operationId: op.operationId,
          status: 'FAILED',
          error: err.message || 'Processing failed',
        });
      }
    }

    return results;
  }
}
