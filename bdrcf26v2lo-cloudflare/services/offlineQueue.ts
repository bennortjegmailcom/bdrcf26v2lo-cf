export interface OfflineAction {
  id: string;
  type: 'CREATE_REPORT' | 'UPDATE_REPORT' | 'LOTO_ACTION';
  payload: any;
  timestamp: string;
}

const OFFLINE_QUEUE_KEY = 'cache_offline_actions';

export function getOfflineActions(): OfflineAction[] {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function enqueueOfflineAction(action: Omit<OfflineAction, 'id' | 'timestamp'>): OfflineAction {
  const actions = getOfflineActions();
  const newAction: OfflineAction = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    ...action
  };
  actions.push(newAction);
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(actions));
  window.dispatchEvent(new CustomEvent('offline_queue_updated', { detail: { count: actions.length } }));
  return newAction;
}

export function clearOfflineActions(): void {
  localStorage.removeItem(OFFLINE_QUEUE_KEY);
  window.dispatchEvent(new CustomEvent('offline_queue_updated', { detail: { count: 0 } }));
}

/**
 * Flushes and executes all staged offline actions once connectivity is restored.
 */
export async function flushOfflineQueue(handlers: {
  createReport?: (payload: any, operationId: string) => Promise<any> | any;
  updateReport?: (reportId: string, updates: any) => Promise<any> | any;
}): Promise<number> {
  const actions = getOfflineActions();
  if (actions.length === 0) return 0;

  let successfulCount = 0;
  const completed = new Set<string>();
  for (const item of actions) {
    try {
      if (item.type === 'CREATE_REPORT' && handlers.createReport) {
        await handlers.createReport(item.payload, item.id);
        successfulCount++;
        completed.add(item.id);
      } else if (item.type === 'UPDATE_REPORT' && handlers.updateReport) {
        await handlers.updateReport(item.payload.id, item.payload.updates || Object.fromEntries(Object.entries(item.payload).filter(([key]) => key !== 'id')));
        successfulCount++;
        completed.add(item.id);
      }
    } catch (err) {
      console.warn('Failed executing offline sync action item:', item.id, err);
    }
  }

  const remaining = getOfflineActions().filter(item => !completed.has(item.id));
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remaining));
  window.dispatchEvent(new CustomEvent('offline_queue_updated', { detail: { count: remaining.length } }));
  return successfulCount;
}
