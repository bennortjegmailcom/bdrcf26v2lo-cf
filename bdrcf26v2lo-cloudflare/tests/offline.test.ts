import test from 'node:test';
import assert from 'node:assert/strict';
import { enqueueOfflineAction, flushOfflineQueue, getOfflineActions } from '../services/offlineQueue';
const values = new Map<string, string>();
Object.assign(globalThis, {
  localStorage: { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) },
  window: new EventTarget(),
});
test('Offline flush preserves unhandled, failed and concurrently enqueued actions', async () => {
  values.clear();
  enqueueOfflineAction({ type: 'CREATE_REPORT', payload: { equipment: 'A' } });
  enqueueOfflineAction({ type: 'UPDATE_REPORT', payload: { id: 'one', updates: { details: 'B' } } });
  enqueueOfflineAction({ type: 'LOTO_ACTION', payload: {} });
  assert.equal(await flushOfflineQueue({}), 0);
  assert.equal(getOfflineActions().length, 3);
  const completed = await flushOfflineQueue({
    async createReport() { enqueueOfflineAction({ type: 'CREATE_REPORT', payload: { equipment: 'Concurrent' } }); },
    async updateReport() { throw new Error('Network failed'); },
  });
  assert.equal(completed, 1);
  assert.equal(getOfflineActions().length, 3);
  assert.ok(getOfflineActions().some(a => a.payload.equipment === 'Concurrent'));
  assert.ok(getOfflineActions().some(a => a.type === 'LOTO_ACTION'));
});
