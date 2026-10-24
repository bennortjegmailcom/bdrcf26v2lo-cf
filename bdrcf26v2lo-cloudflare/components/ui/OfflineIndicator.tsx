import { BdrApiClient } from '../../src/repositories/api/BdrApiClient';
import React, { useState, useEffect } from 'react';
import { getOfflineActions, flushOfflineQueue } from '../../services/offlineQueue';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

const api = new BdrApiClient();
const syncHandlers = {
  async createReport(payload: any, operationId: string) {
    const results = await api.request<{ status: string; error?: string }[]>('/sync', {
      method: 'POST', body: JSON.stringify({ operations: [{ operationId, type: 'CREATE_REPORT', payload }] }),
    });
    if (results[0]?.status !== 'SUCCESS') throw new Error(results[0]?.error || 'Sync failed');
  },
  async updateReport(id: string, updates: any) {
    await api.request(`/reports/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(updates) });
  },
};

interface OfflineIndicatorProps {
  onSyncComplete?: (count: number) => void;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ onSyncComplete }) => {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [queueCount, setQueueCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    setQueueCount(getOfflineActions().length);

    const handleOnline = async () => {
      setIsOnline(true);
      const pending = getOfflineActions().length;
      if (pending > 0) {
        setIsSyncing(true);
        const synced = await flushOfflineQueue(syncHandlers);
        setIsSyncing(false);
        setQueueCount(getOfflineActions().length);
        if (onSyncComplete && synced > 0) onSyncComplete(synced);
      }
    };

    const handleOffline = () => setIsOnline(false);
    const handleQueueUpdate = (e: any) => setQueueCount(e.detail?.count ?? getOfflineActions().length);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('offline_queue_updated', handleQueueUpdate);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('offline_queue_updated', handleQueueUpdate);
    };
  }, [onSyncComplete]);

  const handleManualSync = async () => {
    setIsSyncing(true);
    const synced = await flushOfflineQueue(syncHandlers);
    setIsSyncing(false);
    setQueueCount(getOfflineActions().length);
    if (onSyncComplete && synced > 0) onSyncComplete(synced);
  };

  // If online and no queued items, don't clutter the screen
  if (isOnline && queueCount === 0) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-gray-900/95 border border-gray-700/80 px-3.5 py-2 text-xs font-semibold text-white shadow-2xl backdrop-blur-md animate-fadeIn">
      {!isOnline ? (
        <>
          <span className="flex items-center gap-1.5 text-amber-400">
            <WifiOff className="w-4 h-4 animate-pulse" />
            <span>Plant Offline Mode</span>
          </span>
          <span className="text-[10px] text-gray-400">
            ({queueCount} action{queueCount === 1 ? '' : 's'} staged)
          </span>
        </>
      ) : (
        <>
          <span className="flex items-center gap-1.5 text-emerald-400">
            <Wifi className="w-4 h-4" />
            <span>Connected ({queueCount} pending sync)</span>
          </span>
          <button
            type="button"
            onClick={handleManualSync}
            disabled={isSyncing}
            className="ml-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>
        </>
      )}
    </div>
  );
};

export default OfflineIndicator;
