import './setup';
import test from 'node:test';
import assert from 'node:assert/strict';
import { D1LockoutsRepository } from '../src/repositories/d1/lockouts.repository';
import { ConflictError } from '../src/errors/api.error';
import type { LockoutAuditEvent } from '../src/domain/types';

test('simultaneous lockout actions preserve one winner and its audit event', async () => {
  const repo = new D1LockoutsRepository();
  const ticket = await repo.createLockout({
    equipment: 'Test belt', equipmentNumber: 'CAS-1', workGroup: 'Mechanical',
    status: 'LOCKOUT_REQUESTED', state: 'LOCKOUT_REQUESTED', lockoutComments: '',
    bookedDurationMinutes: null, lockoutTime: new Date().toISOString(),
  });
  const event = (userId: string): LockoutAuditEvent => ({
    ticketId: ticket.id, equipment: ticket.equipment, equipmentNumber: ticket.equipmentNumber,
    userId, userName: userId, action: 'CONFIRM_EQUIPMENT', previousState: 'LOCKOUT_REQUESTED',
    newState: 'EQUIPMENT_CONFIRMED', timestamp: new Date().toISOString(),
  });
  const results = await Promise.allSettled([
    repo.updateLockoutWithAudit(ticket.id, { status: 'EQUIPMENT_CONFIRMED', state: 'EQUIPMENT_CONFIRMED' }, event('a')),
    repo.updateLockoutWithAudit(ticket.id, { status: 'EQUIPMENT_CONFIRMED', state: 'EQUIPMENT_CONFIRMED' }, event('b')),
  ]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(results.filter(result => result.status === 'rejected' && result.reason instanceof ConflictError).length, 1);
  const saved = await repo.getLockout(ticket.id);
  assert.equal(saved?.auditEvents?.length, 1);
});
