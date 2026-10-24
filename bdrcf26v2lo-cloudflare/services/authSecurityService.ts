import { User, Role } from '../types';
import { sealAuditLogEntry } from './tamperProofAudit';

export interface WindowsHelloResult {
  success: boolean;
  method?: 'windows_hello' | 'fallback_pin';
  credentialId?: string;
  error?: string;
  cancelled?: boolean;
}

const SECURITY_MODE_KEY = 'bdr_enterprise_security_mode';
const WINDOWS_ACCOUNT_KEY = 'bdr_windows_corporate_account';

/**
 * Checks if the browser runtime supports WebAuthn / FIDO2.
 */
export function isWebAuthnSupported(): boolean {
  return typeof window !== 'undefined' && 
         typeof window.PublicKeyCredential !== 'undefined' &&
         typeof navigator.credentials !== 'undefined';
}

/**
 * Checks if a platform authenticator (Windows Hello, Touch ID, Android biometrics) is present.
 */
export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (!isWebAuthnSupported()) return false;
  try {
    if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    }
  } catch {
    // Graceful fallback
  }
  return false;
}

/**
 * Gets whether Strict Enterprise Security Mode is active.
 * Defaults to true to prevent unauthenticated logins.
 */
export function isEnterpriseSecurityMode(): boolean {
  if (typeof window === 'undefined') return true;
  const stored = localStorage.getItem(SECURITY_MODE_KEY);
  if (stored === null) return true; // Default to secure
  return stored === 'true';
}

/**
 * Sets Strict Enterprise Security Mode.
 */
export function setEnterpriseSecurityMode(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SECURITY_MODE_KEY, enabled ? 'true' : 'false');
}

/**
 * Gets the remembered Windows corporate UPN or domain account.
 */
export function getSavedWindowsAccount(): string {
  if (typeof window === 'undefined') return 'ben.nortje@exxaro.com';
  return localStorage.getItem(WINDOWS_ACCOUNT_KEY) || 'ben.nortje@exxaro.com';
}

/**
 * Saves the Windows corporate UPN or domain account.
 */
export function saveWindowsAccount(account: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(WINDOWS_ACCOUNT_KEY, account.trim());
}

/**
 * Prompts native Windows Hello via WebAuthn platform authenticator.
 * This triggers the Windows system modal for Fingerprint, Face ID, or Windows PIN.
 */
export async function authenticateWithWindowsHello(
  user: { id: string; name: string; email?: string }
): Promise<WindowsHelloResult> {
  if (!isWebAuthnSupported()) {
    return {
      success: false,
      error: 'WebAuthn / Windows Hello is not supported in this browser environment.'
    };
  }

  try {
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const credentialCreationOptions: CredentialCreationOptions = {
      publicKey: {
        challenge,
        rp: {
          name: 'Exxaro Plant Breakdown Reporter',
          id: window.location.hostname === 'localhost' ? 'localhost' : window.location.hostname
        },
        user: {
          id: new TextEncoder().encode(user.id),
          name: user.email || `${user.id}@exxaro.com`,
          displayName: user.name || 'Plant Operator'
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' },  // ES256
          { alg: -257, type: 'public-key' } // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform', // Enforce Windows Hello hardware platform
          userVerification: 'required',        // Requires Windows PIN / Biometrics
          requireResidentKey: false
        },
        timeout: 60000,
        attestation: 'none'
      }
    };

    const credential = (await navigator.credentials.create(
      credentialCreationOptions
    )) as PublicKeyCredential | null;

    if (credential) {
      const credId = credential.id;
      // Store credential binding
      try {
        localStorage.setItem(`bdr_webauthn_${user.id}`, credId);
      } catch {}

      // Log successful security attestation
      try {
        const cachedLogs = JSON.parse(localStorage.getItem('cache_audit_logs') || '[]');
        const sealed = await sealAuditLogEntry({
          timestamp: new Date().toISOString(),
          userId: user.id,
          userName: user.name,
          action: 'CREATE',
          entityType: 'AUTH_SESSION',
          entityId: credId,
          details: `Windows Hello biometric/PIN authentication verified on Windows workstation for ${user.name}`
        }, cachedLogs);
        cachedLogs.unshift(sealed);
        localStorage.setItem('cache_audit_logs', JSON.stringify(cachedLogs.slice(0, 300)));
      } catch {}

      return {
        success: true,
        method: 'windows_hello',
        credentialId: credId
      };
    }

    return {
      success: false,
      error: 'Windows Hello verification did not return valid credentials.'
    };
  } catch (err: any) {
    const msg = err?.message || String(err);
    const isCancelled = err?.name === 'NotAllowedError' || msg.includes('cancelled') || msg.includes('abort');
    
    return {
      success: false,
      error: isCancelled ? 'Windows Hello prompt was cancelled or timed out.' : msg,
      cancelled: isCancelled
    };
  }
}

/**
 * Verifies password or PIN for any user profile.
 */
export function verifyUserCredentials(user: User, secret: string): { valid: boolean; reason?: string } {
  const trimmed = secret.trim();
  if (!trimmed) {
    return { valid: false, reason: 'Please enter your password or PIN.' };
  }

  // Check custom user PIN first
  if (user.pin && user.pin === trimmed) {
    return { valid: true };
  }

  // Check user password
  if (user.password && user.password === trimmed) {
    return { valid: true };
  }

  // For seeded accounts that have default password 'Password1'
  if (!user.password && !user.pin) {
    // If user has not yet set a password, allow standard default 'Password1' or any 4+ digit PIN
    if (trimmed === 'Password1' || trimmed === '1234' || trimmed === '2026') {
      return { valid: true };
    }
    return { 
      valid: false, 
      reason: 'Incorrect credentials. For first login on this terminal, use "Password1" or "1234".' 
    };
  }

  // Also accept case-insensitive 'password1' if password is 'Password1'
  if (user.password?.toLowerCase() === trimmed.toLowerCase()) {
    return { valid: true };
  }

  return { valid: false, reason: 'Invalid password or security PIN. Please check and try again.' };
}

/**
 * Updates a user's security PIN or password in local storage.
 */
export function updateUserPinOrPassword(
  userId: string, 
  newSecret: string, 
  isPin: boolean = true
): boolean {
  try {
    const cachedUsers: User[] = JSON.parse(localStorage.getItem('cache_users') || '[]');
    const index = cachedUsers.findIndex(u => u.id === userId || u.uid === userId);
    if (index >= 0) {
      if (isPin) {
        cachedUsers[index].pin = newSecret;
      } else {
        cachedUsers[index].password = newSecret;
      }
      localStorage.setItem('cache_users', JSON.stringify(cachedUsers));
      return true;
    }
  } catch {
    // Handle error
  }
  return false;
}

/**
 * Checks whether a given role is privileged and requires mandatory authentication.
 */
export function isPrivilegedRole(role: Role): boolean {
  return [
    Role.ADMIN,
    Role.SCHEDULER,
    Role.FOREMAN,
    Role.OPS_FOREMAN,
    Role.MECH_SUPERVISOR,
    Role.ELEC_SUPERVISOR,
    Role.TECH_SUPERVISOR,
    Role.INST_SUPERVISOR
  ].includes(role);
}
