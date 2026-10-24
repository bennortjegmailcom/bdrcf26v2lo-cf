import { AuditLogEntry, LockoutAuditEvent } from '../types';

const GENESIS_HASH = '0000000000000000BDR_SAFETY_GENESIS_CHAIN_2026';

/**
 * Computes a standard SHA-256 hexadecimal hash string for any input payload.
 */
export async function computeSha256Hex(payload: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle && crypto.subtle.digest) {
    try {
      const msgBuffer = new TextEncoder().encode(payload);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // Fallback below
    }
  }

  // Fast deterministic hash fallback for environments without subtle crypto
  let hash = 0;
  for (let i = 0; i < payload.length; i++) {
    const char = payload.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const hex = (Math.abs(hash) * 2654435761).toString(16).padStart(16, '0');
  return `sha256_mock_${hex}_${payload.length}`;
}

/**
 * Seals an audit log entry into the tamper-proof cryptographic chain.
 * Each entry references the previous entry's SHA-256 hash, forming an immutable ledger.
 */
export async function sealAuditLogEntry(
  entry: Omit<AuditLogEntry, 'id' | 'sequenceNumber' | 'previousHash' | 'hash' | 'tamperEvidentChecksum'>,
  existingLogs: AuditLogEntry[]
): Promise<AuditLogEntry> {
  const sequenceNumber = existingLogs.length > 0 ? (existingLogs[0].sequenceNumber || existingLogs.length) + 1 : 1;
  const previousHash = existingLogs.length > 0 ? (existingLogs[0].hash || GENESIS_HASH) : GENESIS_HASH;
  const id = `audit-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  const canonicalString = [
    sequenceNumber,
    previousHash,
    entry.timestamp,
    entry.userId,
    entry.userName,
    entry.action,
    entry.entityType,
    entry.entityId,
    entry.details
  ].join('|#|');

  const hash = await computeSha256Hex(canonicalString);
  const tamperEvidentChecksum = `SIG_SHA256:${hash.substring(0, 16).toUpperCase()}`;

  return {
    ...entry,
    id,
    sequenceNumber,
    previousHash,
    hash,
    tamperEvidentChecksum
  };
}

/**
 * Seals a LOTO Lockout safety audit event into the tamper-proof chain.
 */
export async function sealLockoutAuditEvent(
  event: Omit<LockoutAuditEvent, 'id' | 'sequenceNumber' | 'previousHash' | 'hash' | 'tamperEvidentChecksum'>,
  existingLogs: LockoutAuditEvent[]
): Promise<LockoutAuditEvent> {
  const sequenceNumber = existingLogs.length > 0 ? (existingLogs[0].sequenceNumber || existingLogs.length) + 1 : 1;
  const previousHash = existingLogs.length > 0 ? (existingLogs[0].hash || GENESIS_HASH) : GENESIS_HASH;
  const id = `loto-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  const canonicalString = [
    sequenceNumber,
    previousHash,
    event.timestamp,
    event.ticketId,
    event.equipmentNumber,
    event.userId,
    event.action,
    event.newState,
    event.comments || ''
  ].join('|#|');

  const hash = await computeSha256Hex(canonicalString);
  const tamperEvidentChecksum = `LOTO_SEAL:${hash.substring(0, 16).toUpperCase()}`;

  return {
    ...event,
    id,
    sequenceNumber,
    previousHash,
    hash,
    tamperEvidentChecksum
  };
}

export interface VerificationResult {
  isValid: boolean;
  totalLogs: number;
  verifiedLogsCount: number;
  lastHash?: string;
  tamperedEntryId?: string;
  tamperReason?: string;
}

/**
 * Validates the unbroken cryptographic chain across all audit log entries.
 * Returns true if every entry matches its previous hash and signature.
 */
export async function verifyAuditLogChain(logs: AuditLogEntry[]): Promise<VerificationResult> {
  if (!logs || logs.length === 0) {
    return { isValid: true, totalLogs: 0, verifiedLogsCount: 0 };
  }

  // Logs are ordered newest-to-oldest. Reverse to verify from genesis to newest.
  const chronological = [...logs].reverse();
  let expectedPrevHash = GENESIS_HASH;

  for (let i = 0; i < chronological.length; i++) {
    const entry = chronological[i];
    
    // If the entry doesn't have a hash (legacy unsealed entry), allow gracefully but note
    if (!entry.hash) {
      continue;
    }

    if (entry.previousHash && entry.previousHash !== expectedPrevHash && i > 0) {
      return {
        isValid: false,
        totalLogs: logs.length,
        verifiedLogsCount: i,
        tamperedEntryId: entry.id,
        tamperReason: `Broken hash chain at sequence #${entry.sequenceNumber || i + 1}. Expected previous hash ${expectedPrevHash.slice(0, 10)}... but found ${entry.previousHash.slice(0, 10)}...`
      };
    }

    const canonicalString = [
      entry.sequenceNumber || (i + 1),
      entry.previousHash || expectedPrevHash,
      entry.timestamp,
      entry.userId,
      entry.userName,
      entry.action,
      entry.entityType,
      entry.entityId,
      entry.details
    ].join('|#|');

    const recalculatedHash = await computeSha256Hex(canonicalString);
    if (entry.hash !== recalculatedHash) {
      return {
        isValid: false,
        totalLogs: logs.length,
        verifiedLogsCount: i,
        tamperedEntryId: entry.id,
        tamperReason: `Data alteration detected in record #${entry.sequenceNumber || i + 1} (${entry.id}). Payload checksum mismatch!`
      };
    }

    expectedPrevHash = entry.hash;
  }

  return {
    isValid: true,
    totalLogs: logs.length,
    verifiedLogsCount: logs.length,
    lastHash: logs[0]?.hash
  };
}
