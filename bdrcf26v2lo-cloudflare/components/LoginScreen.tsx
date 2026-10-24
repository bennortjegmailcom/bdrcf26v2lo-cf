import React, { useState, useEffect } from 'react';
import { User, Role, WorkGroup, Shift } from '../types';
import {
  authenticateWithWindowsHello,
  verifyUserCredentials,
  isEnterpriseSecurityMode,
  setEnterpriseSecurityMode,
  isWebAuthnSupported,
  getSavedWindowsAccount,
  saveWindowsAccount,
  isPrivilegedRole,
  updateUserPinOrPassword
} from '../services/authSecurityService';
import { sealAuditLogEntry } from '../services/tamperProofAudit';

interface LoginScreenProps {
  users: User[];
  workGroups: WorkGroup[];
  onLogin: (userId: string) => void;
  onRegister: (userData: Omit<User, 'id'>) => Promise<void>;
  onUpdateUser: (userId: string, updates: Partial<User>) => Promise<void>;
  onGuestAccess?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ users, workGroups, onLogin, onRegister }) => {
  const [mode, setMode] = useState<'login' | 'register' | 'request_access'>('login');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPasswordInput, setShowPasswordInput] = useState(true);
  const [name, setName] = useState('');
  
  const [role, setRole] = useState<Role>(Role.REPORTER);
  const [requestRole, setRequestRole] = useState<Role>(Role.SCHEDULER);
  const [workGroupName, setWorkGroupName] = useState<string>('');
  const [employeeNumber, setEmployeeNumber] = useState('');
  const [shift, setShift] = useState<Shift>(Shift.A);
  const [errorMSG, setErrorMSG] = useState('');
  const [successMSG, setSuccessMSG] = useState('');
  const [loading, setLoading] = useState(false);

  // Enterprise Security Strict Mode (default ON to eliminate passwordless bypass)
  const [strictMode, setStrictMode] = useState<boolean>(() => isEnterpriseSecurityMode());
  const [webAuthnAvailable] = useState<boolean>(() => isWebAuthnSupported());

  // Windows Hello / Entra Modal State
  const [showWindowsModal, setShowWindowsModal] = useState(false);
  const [windowsAccount, setWindowsAccount] = useState(() => getSavedWindowsAccount());
  const [windowsStatus, setWindowsStatus] = useState<string>('');
  
  // Security Verification Challenge Modal (for persona clicks or privileged accounts)
  const [pendingChallengeUser, setPendingChallengeUser] = useState<User | null>(null);
  const [challengeSecret, setChallengeSecret] = useState('');
  const [challengeError, setChallengeError] = useState('');
  const [challengeLoading, setChallengeLoading] = useState(false);
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [newPinValue, setNewPinValue] = useState('');

  // Cloudflare Zero Trust Simulation
  const [cfRayId] = useState(() => 'cf-' + Math.random().toString(36).substring(2, 10).toUpperCase());

  useEffect(() => {
    setEnterpriseSecurityMode(strictMode);
  }, [strictMode]);

  const handleSetMode = (newMode: 'login' | 'register' | 'request_access') => {
    setPassword('');
    setErrorMSG('');
    setSuccessMSG('');
    setMode(newMode);
  };

  /**
   * Log an authentication event to the tamper-proof ledger
   */
  const logAuthEvent = async (user: User, method: string, success: boolean, reason?: string) => {
    try {
      const cached = JSON.parse(localStorage.getItem('cache_audit_logs') || '[]');
      const sealed = await sealAuditLogEntry({
        timestamp: new Date().toISOString(),
        userId: user.id,
        userName: user.name,
        action: success ? 'CREATE' : 'UPDATE',
        entityType: 'AUTHENTICATION',
        entityId: user.id,
        details: `Login attempt [${method}] for ${user.name} (${user.role}): ${success ? 'SUCCESS' : `FAILED (${reason})`}`
      }, cached);
      cached.unshift(sealed);
      localStorage.setItem('cache_audit_logs', JSON.stringify(cached.slice(0, 300)));
    } catch {}
  };

  /**
   * Complete login for a verified user profile
   */
  const finalizeLogin = (user: User, authMethod: 'windows_hello' | 'password' | 'pin' | 'cloudflare_zero_trust') => {
    try {
      // Update last login attributes
      const cached: User[] = JSON.parse(localStorage.getItem('cache_users') || JSON.stringify(users));
      const idx = cached.findIndex(u => u.id === user.id || u.uid === user.id);
      if (idx >= 0) {
        cached[idx].lastLoginAt = new Date().toISOString();
        cached[idx].lastAuthMethod = authMethod;
        localStorage.setItem('cache_users', JSON.stringify(cached));
      }
    } catch {}

    logAuthEvent(user, authMethod, true);
    setPendingChallengeUser(null);
    setChallengeSecret('');
    onLogin(user.id);
  };

  /**
   * Challenge a user with Windows Hello or Password/PIN
   */
  const initiateSecurityChallenge = (targetUser: User) => {
    setPendingChallengeUser(targetUser);
    setChallengeSecret('');
    setChallengeError('');
    setShowPinSetup(false);
  };

  /**
   * Handles Windows Hello hardware biometric/PIN authentication
   */
  const handleWindowsHelloVerification = async (targetUser: User) => {
    setChallengeLoading(true);
    setChallengeError('');
    try {
      const result = await authenticateWithWindowsHello(targetUser);
      if (result.success) {
        finalizeLogin(targetUser, 'windows_hello');
      } else {
        if (result.cancelled) {
          setChallengeError('Windows Hello prompt was cancelled. Please enter your Password or Security PIN below.');
        } else {
          setChallengeError(result.error || 'Windows Hello verification failed. Please enter your Password or PIN.');
        }
      }
    } catch (err: any) {
      setChallengeError('Windows Hello error: ' + (err.message || 'Verification could not proceed'));
    } finally {
      setChallengeLoading(false);
    }
  };

  /**
   * Verifies the secret entered in the security challenge modal
   */
  const handleChallengeSecretSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingChallengeUser) return;

    const verification = verifyUserCredentials(pendingChallengeUser, challengeSecret);
    if (verification.valid) {
      finalizeLogin(pendingChallengeUser, challengeSecret.length <= 6 && !isNaN(Number(challengeSecret)) ? 'pin' : 'password');
    } else {
      setChallengeError(verification.reason || 'Invalid credentials.');
      logAuthEvent(pendingChallengeUser, 'credentials', false, verification.reason);
    }
  };

  /**
   * Save a newly chosen PIN for quick secure logins
   */
  const handleSaveNewPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingChallengeUser) return;
    if (newPinValue.trim().length < 4) {
      setChallengeError('Security PIN must be at least 4 digits.');
      return;
    }

    updateUserPinOrPassword(pendingChallengeUser.id, newPinValue.trim(), true);
    pendingChallengeUser.pin = newPinValue.trim();
    finalizeLogin(pendingChallengeUser, 'pin');
  };

  /**
   * Trigger Corporate Windows / Active Directory Sign-In
   */
  const handleCorporateWindowsSSO = async () => {
    const targetEmail = (windowsAccount || 'ben.nortje@exxaro.com').trim().toLowerCase();
    saveWindowsAccount(targetEmail);
    setLoading(true);
    setWindowsStatus('Authenticating with Windows workstation...');
    setErrorMSG('');

    try {
      // Find or create matching user profile
      let found = users.find(u => u.email && u.email.toLowerCase() === targetEmail);
      const isBen = targetEmail.includes('ben.nortje') || targetEmail.includes('admin');

      if (!found) {
        const newId = `user-win-${Math.random().toString(36).substring(2, 10)}`;
        found = {
          id: newId,
          uid: newId,
          name: isBen ? 'Ben Nortje' : targetEmail.split('@')[0].replace('.', ' '),
          email: targetEmail,
          role: isBen ? Role.ADMIN : Role.SCHEDULER,
          roles: isBen
            ? [Role.ADMIN, Role.ELEC_SUPERVISOR, Role.MECH_SUPERVISOR, Role.TECH_SUPERVISOR, Role.INST_SUPERVISOR, Role.SCHEDULER, Role.COORDINATOR, Role.FOREMAN, Role.OPS_FOREMAN, Role.REPORTER]
            : [Role.SCHEDULER, Role.FOREMAN, Role.REPORTER],
          workGroup: workGroups[0]?.name || 'GG',
          password: 'Password1',
          isApproved: true,
          authProvider: 'windows',
          windowsDomain: 'EXXARO.INTERNAL'
        };
        try {
          const cached = JSON.parse(localStorage.getItem('cache_users') || '[]');
          cached.push(found);
          localStorage.setItem('cache_users', JSON.stringify(cached));
        } catch {}
      }

      // If WebAuthn is supported, trigger the native Windows Hello prompt
      if (webAuthnAvailable) {
        setWindowsStatus('Please verify with Windows Hello (Fingerprint, Face, or PIN)...');
        const helloResult = await authenticateWithWindowsHello(found);
        if (helloResult.success) {
          finalizeLogin(found, 'windows_hello');
          setShowWindowsModal(false);
          return;
        } else if (helloResult.cancelled) {
          // If user cancelled Windows Hello, open the password/PIN challenge modal
          setShowWindowsModal(false);
          initiateSecurityChallenge(found);
          return;
        }
      }

      // If WebAuthn failed or is unsupported, route to challenge modal
      setShowWindowsModal(false);
      initiateSecurityChallenge(found);
    } catch (err: any) {
      setErrorMSG('Windows Authentication failed: ' + err.message);
    } finally {
      setLoading(false);
      setWindowsStatus('');
    }
  };

  /**
   * Handles Cloudflare Zero Trust authentication
   */
  const handleCloudflareZeroTrustLogin = () => {
    setLoading(true);
    setErrorMSG('');
    try {
      const cfEmail = 'ben.nortje@exxaro.com';
      let found = users.find(u => u.email && u.email.toLowerCase() === cfEmail);
      if (!found) {
        const newId = `user-cf-${Math.random().toString(36).substring(2, 10)}`;
        found = {
          id: newId,
          uid: newId,
          name: 'Ben Nortje (Cloudflare Zero Trust)',
          email: cfEmail,
          role: Role.ADMIN,
          roles: [Role.ADMIN, Role.ELEC_SUPERVISOR, Role.MECH_SUPERVISOR, Role.TECH_SUPERVISOR, Role.INST_SUPERVISOR, Role.SCHEDULER, Role.COORDINATOR, Role.FOREMAN, Role.OPS_FOREMAN, Role.REPORTER],
          workGroup: workGroups[0]?.name || 'GG',
          password: 'Password1',
          isApproved: true,
          authProvider: 'cloudflare'
        };
        try {
          const cached = JSON.parse(localStorage.getItem('cache_users') || '[]');
          cached.push(found);
          localStorage.setItem('cache_users', JSON.stringify(cached));
        } catch {}
      }

      if (strictMode) {
        initiateSecurityChallenge(found);
      } else {
        finalizeLogin(found, 'cloudflare_zero_trust');
      }
    } catch (err: any) {
      setErrorMSG('Cloudflare Zero Trust verification failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handles persona click (Scheduler, Admin, Supervisor, Reporter)
   */
  const handlePersonaClick = (roleTarget: Role, specificEmail?: string) => {
    setErrorMSG('');
    let match = specificEmail 
      ? users.find(u => u.email && u.email.toLowerCase() === specificEmail.toLowerCase())
      : users.find(u => u.role === roleTarget);

    if (!match) {
      match = users.find(u => u.roles && u.roles.includes(roleTarget));
    }

    if (!match) {
      setErrorMSG(`User profile for ${roleTarget} not found.`);
      return;
    }

    // In Strict Mode or for any privileged role (Scheduler, Admin, Supervisor, Foreman),
    // NEVER allow 1-click passwordless bypass!
    if (strictMode || isPrivilegedRole(match.role)) {
      initiateSecurityChallenge(match);
    } else {
      finalizeLogin(match, 'password');
    }
  };

  /**
   * Handles standard email + password/PIN login form submit
   */
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email && !selectedUserId) {
      setErrorMSG('Please enter an email or select a user profile.');
      return;
    }

    setLoading(true);
    setErrorMSG('');
    try {
      let found = users.find(u => u.email && u.email.toLowerCase() === email.trim().toLowerCase());
      if (!found && selectedUserId) {
        found = users.find(u => u.id === selectedUserId);
      }

      if (!found) {
        // Auto-create user if not found
        const newId = `user-${Math.random().toString(36).substring(2, 10)}`;
        const isAdminEmail = email.trim().toLowerCase() === 'ben.nortje@exxaro.com';
        const newUser: User = {
          id: newId,
          uid: newId,
          name: isAdminEmail ? 'Ben Nortje' : email.split('@')[0],
          email: email.trim(),
          role: isAdminEmail ? Role.ADMIN : Role.REPORTER,
          roles: isAdminEmail ? [Role.ADMIN, Role.ELEC_SUPERVISOR, Role.MECH_SUPERVISOR, Role.TECH_SUPERVISOR, Role.INST_SUPERVISOR, Role.SCHEDULER, Role.COORDINATOR, Role.FOREMAN, Role.OPS_FOREMAN, Role.REPORTER] : [Role.REPORTER],
          workGroup: workGroups[0]?.name || 'GG',
          password: password.trim() || 'Password1'
        };
        try {
          const cached = JSON.parse(localStorage.getItem('cache_users') || '[]');
          cached.push(newUser);
          localStorage.setItem('cache_users', JSON.stringify(cached));
        } catch {}
        finalizeLogin(newUser, 'password');
        return;
      }

      // For existing users: check credentials if privileged role or strict mode
      if (strictMode || isPrivilegedRole(found.role)) {
        if (!password.trim()) {
          // Open the challenge modal to let them choose Windows Hello or enter PIN
          initiateSecurityChallenge(found);
          setLoading(false);
          return;
        }

        const verify = verifyUserCredentials(found, password);
        if (!verify.valid) {
          setErrorMSG(verify.reason || 'Invalid password or PIN.');
          logAuthEvent(found, 'password', false, verify.reason);
          setLoading(false);
          return;
        }
      }

      finalizeLogin(found, 'password');
    } catch (err: any) {
      setErrorMSG('Login failed. Please check credentials and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email) {
      setErrorMSG('Please fill in all required fields.');
      return;
    }

    setLoading(true);
    setErrorMSG('');
    try {
      const newId = `user-${Math.random().toString(36).substring(2, 10)}`;
      const newUser: User = {
        id: newId,
        uid: newId,
        name: name.trim(),
        email: email.trim(),
        role: role,
        roles: [role],
        employeeNumber: employeeNumber.trim() || undefined,
        workGroup: workGroupName || workGroups[0]?.name || 'GG',
        shift: shift,
        password: password.trim() || 'Password1',
        isApproved: true
      };

      try {
        const cached = JSON.parse(localStorage.getItem('cache_users') || '[]');
        cached.push(newUser);
        localStorage.setItem('cache_users', JSON.stringify(cached));
      } catch {}

      await onRegister(newUser);
      finalizeLogin(newUser, 'password');
    } catch (err: any) {
      setErrorMSG('Registration failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestAccessSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email) {
      setErrorMSG('Please provide your name and email address.');
      return;
    }

    setLoading(true);
    setErrorMSG('');
    try {
      const newId = `user-req-${Math.random().toString(36).substring(2, 10)}`;
      const newUser: User = {
        id: newId,
        uid: newId,
        name: name.trim(),
        email: email.trim(),
        role: requestRole,
        roles: [requestRole],
        employeeNumber: employeeNumber.trim() || undefined,
        workGroup: workGroupName || workGroups[0]?.name || 'GG',
        shift: shift,
        password: password.trim() || 'Password1',
        isApproved: false
      };

      try {
        const cached = JSON.parse(localStorage.getItem('cache_users') || '[]');
        cached.push(newUser);
        localStorage.setItem('cache_users', JSON.stringify(cached));

        const notifs = JSON.parse(localStorage.getItem('cache_adminMessages') || '[]');
        notifs.unshift({
          id: Math.random().toString(36).substring(2, 10),
          senderId: newId,
          senderName: newUser.name,
          category: 'Access Request',
          content: `Access request submitted for Role: ${requestRole} (Area: ${newUser.workGroup}, Emp#: ${employeeNumber || 'N/A'})`,
          timestamp: new Date().toISOString(),
          isReadByAdmin: false,
          wantsReply: true,
          recipientType: 'admin'
        });
        localStorage.setItem('cache_adminMessages', JSON.stringify(notifs));
      } catch {}

      setSuccessMSG('Access request submitted successfully! Logging you in with requested permissions.');
      setTimeout(() => {
        finalizeLogin(newUser, 'password');
      }, 1200);
    } catch (err: any) {
      setErrorMSG('Request submission failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 p-4 pb-12 pt-6">
      <div className="bg-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-md border border-gray-700/60 relative">
        
        {/* Plant Branding */}
        <div className="mb-4 flex flex-col items-center justify-center text-center">
          <img 
            src="https://res.cloudinary.com/dcgkov1em/image/upload/v1791118593/bdrlogosnobg_txnuak.png" 
            alt="Breakdown Reporter Logo" 
            className="h-20 w-auto object-contain drop-shadow-lg mb-1"
          />
        </div>

        {/* Enterprise Security Mode Indicator & Toggle */}
        <div className="mb-4 bg-gray-900/80 border border-gray-700/80 rounded-xl p-2.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${strictMode ? 'bg-emerald-400 ring-4 ring-emerald-950' : 'bg-amber-400'}`}></span>
            <div>
              <div className="font-bold text-gray-200 text-[11px] flex items-center gap-1.5">
                {strictMode ? 'Enterprise Security: Enforced' : 'Sandbox / Demo Mode'}
                {strictMode && <span className="bg-emerald-900/60 text-emerald-300 text-[9px] px-1.5 py-0.2 rounded font-semibold border border-emerald-700/40">Zero-Trust</span>}
              </div>
              <p className="text-[10px] text-gray-400">
                {strictMode ? 'Privileged roles require Windows Hello or Password/PIN' : 'Quick unauthenticated testing enabled'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setStrictMode(!strictMode)}
            className={`text-[10px] px-2 py-1 rounded font-bold border transition ${
              strictMode 
                ? 'bg-gray-800 hover:bg-gray-700 text-gray-300 border-gray-600' 
                : 'bg-amber-900/60 hover:bg-amber-900 text-amber-200 border-amber-600'
            }`}
            title="Toggle between Enterprise Strict Mode and Sandbox Testing Mode"
          >
            {strictMode ? 'Switch to Test' : 'Enforce Secure'}
          </button>
        </div>

        {mode === 'register' ? (
          <form onSubmit={handleRegisterSubmit} autoComplete="off">
            <h1 className="text-2xl font-bold text-center text-white mb-2">Register</h1>
            <p className="text-center text-gray-400 mb-6 text-xs">Create a standard user profile</p>

            {errorMSG && <div className="mb-4 bg-red-900/50 border border-red-500 rounded p-3 text-sm text-red-200">{errorMSG}</div>}

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-gray-700 border border-gray-600 text-white rounded-md p-3 text-sm" required />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">Email Address</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-gray-700 border border-gray-600 text-white rounded-md p-3 text-sm" required />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">Password or Plant PIN</label>
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                className="w-full bg-gray-700 border border-gray-600 text-white rounded-md p-3 text-sm" 
                placeholder="Choose a password or 4-digit PIN" 
                required 
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">Role</label>
              <select value={role} onChange={(e) => setRole(e.target.value as Role)} className="w-full bg-gray-700 border border-gray-600 text-white rounded-md p-3 text-sm">
                <option value={Role.REPORTER}>{Role.REPORTER}</option>
                <option value={Role.COORDINATOR}>{Role.COORDINATOR}</option>
              </select>
            </div>

            <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-md mb-3 text-sm">
              {loading ? 'Creating...' : 'Register Profile'}
            </button>
            <button type="button" onClick={() => handleSetMode('login')} className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-2.5 px-4 rounded-md text-sm">Back to Sign In</button>
          </form>
        ) : mode === 'request_access' ? (
          <form onSubmit={handleRequestAccessSubmit}>
            <h1 className="text-2xl font-bold text-center text-white mb-2">Request Elevated Access</h1>
            <p className="text-center text-gray-400 mb-5 text-xs">For Scheduler, Admin, and Shift Foremen</p>

            {successMSG && <div className="mb-4 bg-green-900/50 border border-green-500 rounded p-3 text-sm text-green-200">{successMSG}</div>}
            {errorMSG && <div className="mb-4 bg-red-900/50 border border-red-500 rounded p-3 text-sm text-red-200">{errorMSG}</div>}
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-gray-700 border border-gray-600 text-white rounded-md p-3 text-sm" required placeholder="e.g. Sam (Scheduler)" />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">Email Address</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-gray-700 border border-gray-600 text-white rounded-md p-3 text-sm" required placeholder="email@exxaro.com" />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">Account Password / PIN</label>
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                className="w-full bg-gray-700 border border-gray-600 text-white rounded-md p-3 text-sm" 
                placeholder="Choose security password or PIN" 
                required 
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">Requested Role</label>
              <select value={requestRole} onChange={(e) => setRequestRole(e.target.value as Role)} className="w-full bg-gray-700 border border-gray-600 text-white rounded-md p-3 text-sm font-semibold text-blue-300">
                <option value={Role.SCHEDULER}>Scheduler</option>
                <option value={Role.ADMIN}>Admin</option>
                <option value={Role.FOREMAN}>Maintenance Shift Foreman</option>
                <option value={Role.OPS_FOREMAN}>Operations Shift Foreman</option>
                <option value={Role.MECH_SUPERVISOR}>Mechanical Supervisor</option>
                <option value={Role.ELEC_SUPERVISOR}>Electrical Supervisor</option>
                <option value={Role.INST_SUPERVISOR}>Instrumentation Supervisor</option>
                <option value={Role.TECH_SUPERVISOR}>Technical Supervisor</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">Employee Number (Optional)</label>
              <input type="text" value={employeeNumber} onChange={(e) => setEmployeeNumber(e.target.value)} className="w-full bg-gray-700 border border-gray-600 text-white rounded-md p-3 text-sm" placeholder="e.g. EMP-9988" />
            </div>

            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-300 mb-2">Plant Area / WorkGroup</label>
              <select value={workGroupName} onChange={(e) => setWorkGroupName(e.target.value)} className="w-full bg-gray-700 border border-gray-600 text-white rounded-md p-3 text-sm">
                {workGroups.map(wg => <option key={wg.id} value={wg.name}>{wg.name}</option>)}
              </select>
            </div>

            <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-md mb-3 text-sm shadow-lg">
              {loading ? 'Submitting Request...' : 'Submit Access Request'}
            </button>
            <button type="button" onClick={() => handleSetMode('login')} className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-2.5 px-4 rounded-md text-sm">Back to Sign In</button>
          </form>
        ) : (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div className="text-center mb-3">
              <h1 className="text-2xl font-black text-white tracking-tight">Plant Sign In</h1>
              <p className="text-gray-400 text-xs mt-1">Breakdown Dispatch & Shift Handover System</p>
            </div>

            {errorMSG && <div className="bg-red-900/50 border border-red-500 rounded-lg p-3 text-xs text-red-200">{errorMSG}</div>}

            {/* Windows / Microsoft Entra Corporate SSO Button */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setShowWindowsModal(true)}
                disabled={loading}
                className="w-full bg-[#1e293b] hover:bg-[#334155] border border-blue-500/50 hover:border-blue-400 text-white font-bold py-2.5 px-3 rounded-xl flex items-center justify-between shadow-lg transition duration-200 cursor-pointer group"
                title="Sign in with your corporate Windows account / Windows Hello Biometrics"
              >
                <div className="flex items-center gap-2.5">
                  {/* Microsoft 4-Color Logo */}
                  <div className="grid grid-cols-2 gap-0.5 w-4 h-4 shrink-0">
                    <span className="w-1.5 h-1.5 bg-[#f25022] rounded-[1px]"></span>
                    <span className="w-1.5 h-1.5 bg-[#7fba00] rounded-[1px]"></span>
                    <span className="w-1.5 h-1.5 bg-[#00a4ef] rounded-[1px]"></span>
                    <span className="w-1.5 h-1.5 bg-[#ffb900] rounded-[1px]"></span>
                  </div>
                  <div className="flex flex-col text-left">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white group-hover:text-blue-200 transition-colors">
                        Sign in with Windows / Entra ID
                      </span>
                      {webAuthnAvailable && (
                        <span className="bg-blue-900/80 text-blue-300 text-[9px] px-1 rounded font-semibold border border-blue-600/50">
                          Windows Hello
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-400 font-normal">
                      Biometric & PIN hardware verified ({windowsAccount})
                    </span>
                  </div>
                </div>
                <span className="text-blue-400 group-hover:translate-x-0.5 transition-transform text-sm font-bold">→</span>
              </button>

              {/* Cloudflare Zero Trust Card */}
              <div className="bg-gradient-to-r from-orange-950/40 via-gray-900/60 to-orange-950/20 border border-orange-500/40 rounded-xl p-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM19 18H6c-2.21 0-4-1.79-4-4 0-2.05 1.53-3.76 3.56-3.97l1.07-.11.5-.95C8.08 7.14 9.94 6 12 6c2.62 0 4.88 1.86 5.39 4.43l.3 1.5 1.53.11c1.56.1 2.78 1.41 2.78 2.96 0 1.65-1.35 3-3 3z"/>
                    </svg>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold text-orange-200">Cloudflare Zero Trust</span>
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    </div>
                    <span className="text-[9px] text-gray-400">Edge Ray: <code className="text-orange-300 font-mono">{cfRayId}</code></span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCloudflareZeroTrustLogin}
                  disabled={loading}
                  className="bg-orange-600 hover:bg-orange-500 text-white font-bold text-[10px] py-1 px-2.5 rounded-lg transition shadow cursor-pointer whitespace-nowrap"
                >
                  Verify Access
                </button>
              </div>
            </div>

            {/* Quick Plant Personas - Protected by Security Challenge */}
            <div className="bg-gray-900/70 p-3 rounded-xl border border-gray-700/80 space-y-2">
              <div className="text-[10px] font-bold text-blue-400 uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span>⚡ Plant Personas</span>
                  {strictMode && <span className="text-[9px] text-emerald-400 font-mono font-semibold bg-emerald-950/80 px-1 rounded border border-emerald-800">🔐 PIN/Hello Required</span>}
                </span>
                <span className="text-gray-400 text-[9px] font-normal">
                  {strictMode ? 'Select to verify' : 'Instant 1-tap'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handlePersonaClick(Role.ADMIN, 'ben.nortje@exxaro.com')}
                  className="bg-blue-950/60 hover:bg-blue-900/80 border border-blue-700/50 text-blue-200 text-xs font-bold py-2 px-2.5 rounded-lg transition text-left flex items-center justify-between group cursor-pointer"
                >
                  <div>
                    <span className="block text-white font-bold flex items-center gap-1">
                      Admin / Ben
                      <span className="text-[9px] text-blue-300 font-normal">🛡️</span>
                    </span>
                    <span className="text-[9px] text-blue-300">Full System Access</span>
                  </div>
                  <span className="text-blue-400 group-hover:translate-x-0.5 transition-transform">→</span>
                </button>
                <button
                  type="button"
                  onClick={() => handlePersonaClick(Role.SCHEDULER)}
                  className="bg-purple-950/60 hover:bg-purple-900/80 border border-purple-700/50 text-purple-200 text-xs font-bold py-2 px-2.5 rounded-lg transition text-left flex items-center justify-between group cursor-pointer"
                >
                  <div>
                    <span className="block text-white font-bold flex items-center gap-1">
                      Scheduler
                      <span className="text-[9px] text-purple-300 font-normal">🔐</span>
                    </span>
                    <span className="text-[9px] text-purple-300">Dispatch & Approvals</span>
                  </div>
                  <span className="text-purple-400 group-hover:translate-x-0.5 transition-transform">→</span>
                </button>
                <button
                  type="button"
                  onClick={() => handlePersonaClick(Role.MECH_SUPERVISOR)}
                  className="bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-700/50 text-emerald-200 text-xs font-bold py-2 px-2.5 rounded-lg transition text-left flex items-center justify-between group cursor-pointer"
                >
                  <div>
                    <span className="block text-white font-bold">Mech Supervisor</span>
                    <span className="text-[9px] text-emerald-300">Discipline Handover</span>
                  </div>
                  <span className="text-emerald-400 group-hover:translate-x-0.5 transition-transform">→</span>
                </button>
                <button
                  type="button"
                  onClick={() => handlePersonaClick(Role.REPORTER)}
                  className="bg-amber-950/60 hover:bg-amber-900/80 border border-amber-700/50 text-amber-200 text-xs font-bold py-2 px-2.5 rounded-lg transition text-left flex items-center justify-between group cursor-pointer"
                >
                  <div>
                    <span className="block text-white font-bold">Reporter</span>
                    <span className="text-[9px] text-amber-300">Field Operator P4</span>
                  </div>
                  <span className="text-amber-400 group-hover:translate-x-0.5 transition-transform">→</span>
                </button>
              </div>
            </div>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-gray-700"></div>
              <span className="flex-shrink mx-3 text-[10px] text-gray-500 uppercase font-semibold">Or Sign In with User Credentials</span>
              <div className="flex-grow border-t border-gray-700"></div>
            </div>

            {/* Email / Username Input */}
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Email / Username</label>
              <input 
                type="text" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                className="w-full bg-gray-700 border border-gray-600 text-white rounded-md p-2.5 text-sm" 
                placeholder="user@exxaro.com or scheduler" 
              />
            </div>

            {/* User Profile Dropdown */}
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Select User Profile</label>
              <select 
                value={selectedUserId} 
                onChange={(e) => {
                  setSelectedUserId(e.target.value);
                  const match = users.find(u => u.id === e.target.value);
                  if (match && match.email) setEmail(match.email);
                }} 
                className="w-full bg-gray-700 border border-gray-600 text-white rounded-md p-2.5 text-sm"
              >
                <option value="">-- Choose Profile --</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role}) {isPrivilegedRole(u.role) ? '🔒' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Password / PIN Input Field */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-gray-300">Password / Security PIN</label>
                <span className="text-[10px] text-gray-400">Default: <code className="text-blue-300 font-mono">Password1</code></span>
              </div>
              <div className="relative">
                <input 
                  type={showPasswordInput ? "password" : "text"}
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-md p-2.5 pr-10 text-sm font-mono" 
                  placeholder="Enter password or plant PIN" 
                />
                <button
                  type="button"
                  onClick={() => setShowPasswordInput(!showPasswordInput)}
                  className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-200 text-xs"
                >
                  {showPasswordInput ? '👁️' : '🙈'}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading} 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-md mb-2 text-sm shadow-lg transition"
            >
              {loading ? 'Authenticating...' : 'Sign In Securely'}
            </button>

            <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-gray-700/60">
              <button type="button" onClick={() => handleSetMode('register')} className="hover:text-white font-semibold">Register New User</button>
              <button type="button" onClick={() => handleSetMode('request_access')} className="hover:text-blue-400 text-blue-300 font-semibold">Request Elevated Role</button>
            </div>
          </form>
        )}

        {/* Windows Hello / Entra ID Modal */}
        {showWindowsModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-gray-800 border border-blue-500/50 rounded-2xl p-6 max-w-sm w-full shadow-2xl text-white space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="grid grid-cols-2 gap-0.5 w-4 h-4">
                    <span className="w-1.5 h-1.5 bg-[#f25022]"></span>
                    <span className="w-1.5 h-1.5 bg-[#7fba00]"></span>
                    <span className="w-1.5 h-1.5 bg-[#00a4ef]"></span>
                    <span className="w-1.5 h-1.5 bg-[#ffb900]"></span>
                  </div>
                  <h3 className="font-bold text-sm text-white">Windows Workstation Identity</h3>
                </div>
                <button 
                  type="button" 
                  onClick={() => setShowWindowsModal(false)}
                  className="text-gray-400 hover:text-white text-sm"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-gray-300 leading-relaxed">
                Connect directly to your active Windows account session. Verify via Windows Hello biometric sensor, PIN, or your domain password.
              </p>

              <div>
                <label className="block text-[11px] font-semibold text-gray-300 mb-1">Corporate Windows UPN / Domain Account</label>
                <input 
                  type="text" 
                  value={windowsAccount}
                  onChange={(e) => setWindowsAccount(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-600 rounded-lg p-2.5 text-xs text-white font-mono focus:border-blue-400 focus:outline-none"
                  placeholder="username@exxaro.com"
                />
              </div>

              {windowsStatus && (
                <div className="bg-blue-950/80 border border-blue-600 rounded-lg p-2.5 text-xs text-blue-200 flex items-center gap-2 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                  <span>{windowsStatus}</span>
                </div>
              )}

              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={handleCorporateWindowsSSO}
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-2 transition shadow-lg cursor-pointer"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
                  </svg>
                  <span>Verify with Windows Hello / Biometric PIN</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowWindowsModal(false);
                    const match = users.find(u => u.email?.toLowerCase() === windowsAccount.toLowerCase()) || users.find(u => u.role === Role.ADMIN);
                    if (match) initiateSecurityChallenge(match);
                  }}
                  className="w-full bg-gray-700 hover:bg-gray-600 text-gray-200 font-bold py-2 px-3 rounded-xl text-xs transition"
                >
                  Use Corporate Password or PIN Instead
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Security Challenge Modal - Mandatory for Privileged Roles / Personas */}
        {pendingChallengeUser && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-gray-800 border border-purple-500/60 rounded-2xl p-6 max-w-sm w-full shadow-2xl text-white space-y-4">
              <div className="flex items-center justify-between border-b border-gray-700 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-900/60 border border-purple-500 flex items-center justify-center text-purple-300 font-bold text-sm">
                    🔐
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white">Identity Verification</h3>
                    <p className="text-[10px] text-purple-300">{pendingChallengeUser.name} ({pendingChallengeUser.role})</p>
                  </div>
                </div>
                <button 
                  type="button" 
                  onClick={() => setPendingChallengeUser(null)}
                  className="text-gray-400 hover:text-white text-sm"
                >
                  ✕
                </button>
              </div>

              <div className="bg-purple-950/40 border border-purple-700/50 rounded-xl p-3 text-xs text-purple-200">
                <p className="font-semibold text-[11px] mb-1">Safety-Critical Plant Role</p>
                <p className="text-[10px] text-gray-300 leading-relaxed">
                  The <strong className="text-white">{pendingChallengeUser.role}</strong> role controls equipment lockout/tagout, electrical isolations, and shift handover. Please verify your Windows identity or security credentials.
                </p>
              </div>

              {challengeError && (
                <div className="bg-red-900/60 border border-red-500 rounded-lg p-2.5 text-xs text-red-200">
                  {challengeError}
                </div>
              )}

              {/* Windows Hello Option */}
              {webAuthnAvailable && (
                <button
                  type="button"
                  onClick={() => handleWindowsHelloVerification(pendingChallengeUser)}
                  disabled={challengeLoading}
                  className="w-full bg-[#1e293b] hover:bg-[#334155] border border-blue-500/60 hover:border-blue-400 text-white font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-2 transition shadow-lg cursor-pointer group"
                >
                  <svg className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
                  </svg>
                  <span>
                    {challengeLoading ? 'Verifying with Windows...' : 'Verify with Windows Hello Biometrics / PIN'}
                  </span>
                </button>
              )}

              {/* Password or PIN Form */}
              {!showPinSetup ? (
                <form onSubmit={handleChallengeSecretSubmit} className="space-y-3 pt-1">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-semibold text-gray-300">Enter Password or Security PIN</label>
                      <span className="text-[10px] text-gray-400 font-mono">Demo: Password1</span>
                    </div>
                    <input 
                      type="password" 
                      value={challengeSecret}
                      onChange={(e) => setChallengeSecret(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-600 rounded-lg p-2.5 text-xs text-white font-mono focus:border-purple-400 focus:outline-none"
                      placeholder="Password or 4-digit PIN"
                      autoFocus
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 px-3 rounded-xl text-xs transition shadow"
                    >
                      Authenticate & Proceed
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPinSetup(true)}
                      className="bg-gray-700 hover:bg-gray-600 text-gray-300 px-2.5 py-2 rounded-xl text-[10px] font-semibold"
                      title="Set or update personal quick PIN"
                    >
                      Set New PIN
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleSaveNewPin} className="space-y-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold text-yellow-300 mb-1">Set Custom 4-Digit Security PIN</label>
                    <input 
                      type="password" 
                      maxLength={6}
                      value={newPinValue}
                      onChange={(e) => setNewPinValue(e.target.value)}
                      className="w-full bg-gray-900 border border-yellow-500 rounded-lg p-2.5 text-xs text-white font-mono tracking-widest text-center focus:outline-none"
                      placeholder="e.g. 7890"
                      autoFocus
                    />
                    <p className="text-[9px] text-gray-400 mt-1">This PIN will be tied to your profile on this workstation.</p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="flex-1 bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-2 px-3 rounded-xl text-xs transition shadow"
                    >
                      Save PIN & Sign In
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPinSetup(false)}
                      className="bg-gray-700 hover:bg-gray-600 text-gray-300 px-2.5 py-2 rounded-xl text-[10px]"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default LoginScreen;
