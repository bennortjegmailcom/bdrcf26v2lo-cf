import React, { useState, useEffect, useCallback } from 'react';
import { User, BreakdownReport, WorkGroup, Role, Status, Artisan, Shift, ChangeLogEntry, Assignment, DEFAULT_RESOLUTION_STATUSES, ResolutionStatusItem, Operator, UserMessage, AuditLogEntry, HandoverSection, JobTicket, SCHEDULER_APPROVABLE_ROLES } from './types';
import { USERS, INITIAL_REPORTS, INITIAL_WORK_GROUPS, INITIAL_ARTISANS } from './constants';
import LoginScreen from './components/LoginScreen';
import Dashboard from './components/Dashboard';
import EmployeeNumberModal from './components/modals/EmployeeNumberModal';
import FieldReportPortal from './components/field/FieldReportPortal';
import AppFooter from './components/AppFooter';
import OfflineIndicator from './components/ui/OfflineIndicator';
import { dataSyncService } from './services/dataSyncService';
import { authenticateWithWindowsHello, verifyUserCredentials } from './services/authSecurityService';

const BdrMainApp: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isTerminalLocked, setIsTerminalLocked] = useState(false);
  const [unlockSecret, setUnlockSecret] = useState('');
  const [unlockError, setUnlockError] = useState('');
  const [unlockLoading, setUnlockLoading] = useState(false);
  const [reports, setReports] = useState<BreakdownReport[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [workGroups, setWorkGroups] = useState<WorkGroup[]>(() => {
    try {
      const cached = localStorage.getItem('cache_workgroups');
      return cached ? JSON.parse(cached) : INITIAL_WORK_GROUPS;
    } catch {
      return INITIAL_WORK_GROUPS;
    }
  });
  const [artisans, setArtisans] = useState<Artisan[]>([]);
  const [resolutionStatuses, setResolutionStatuses] = useState<ResolutionStatusItem[]>(() => {
    try {
      const cached = localStorage.getItem('cache_resolutionStatuses');
      return cached ? JSON.parse(cached) : DEFAULT_RESOLUTION_STATUSES;
    } catch {
      return DEFAULT_RESOLUTION_STATUSES;
    }
  });
  const [sections, setSections] = useState<HandoverSection[]>(() => {
    try {
      const cached = localStorage.getItem('cache_sections');
      const defaultSections = [
        { id: '1', name: 'Electrical' },
        { id: '2', name: 'Mechanical' },
        { id: '3', name: 'Technicians' },
        { id: '4', name: 'Instrumentation' },
        { id: '5', name: 'Operations' },
        { id: '6', name: 'Services' },
      ];
      return cached ? JSON.parse(cached) : defaultSections;
    } catch {
      return [];
    }
  });
  const [operators, setOperators] = useState<Operator[]>([]);
  const [adminMessages, setAdminMessages] = useState<UserMessage[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [jobTickets, setJobTickets] = useState<JobTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentShift, setCurrentShift] = useState<Shift>(Shift.B);
  const [showEmployeePrompt, setShowEmployeePrompt] = useState(false);
  const [isGuest, setIsGuest] = useState(false);

  const saveSharedList = async <T,>(key: string, value: T[]): Promise<void> => {
    await dataSyncService.getApiClient().request(`/metadata/${key}`, {
      method: 'PUT', body: JSON.stringify({ value }),
    });
  };

  const fetchAndCacheStaticData = useCallback(async () => {
    try {
      const metadata = await dataSyncService.getApiClient().request<{
        workgroups: WorkGroup[]; resolutionStatuses: ResolutionStatusItem[];
        sections: HandoverSection[]; operators: Operator[];
      }>('/metadata');
      const wgData = metadata.workgroups;
      const rsData = metadata.resolutionStatuses;
      const secData = metadata.sections;

      setWorkGroups(wgData);
      setResolutionStatuses(rsData);
      setSections(secData);
      setOperators(metadata.operators);

      localStorage.setItem('cache_workgroups', JSON.stringify(wgData));
      localStorage.setItem('cache_resolutionStatuses', JSON.stringify(rsData));
      localStorage.setItem('cache_sections', JSON.stringify(secData));
      localStorage.setItem('cache_operators', JSON.stringify(metadata.operators));
    } catch (err) {
      console.error("Failed to refresh static data:", err);
    }
  }, []);

  // Consolidate Matimba variations if needed
  useEffect(() => {
    if (workGroups.length === 0) return;
    const targetName = 'Matimba';
    const variations = ['matimba dispatch', 'matimba dispatches', 'matimba dashboards'];
    const toMerge = workGroups.filter(wg => 
      variations.includes(wg.name.toLowerCase()) && wg.name.toLowerCase() !== targetName.toLowerCase()
    );

    if (toMerge.length > 0) {
      const updated = workGroups
        .filter(wg => !variations.includes(wg.name.toLowerCase()))
        .concat([{ id: 'Matimba', name: targetName }]);
      setWorkGroups(updated);
      saveSharedList('workgroups', updated).catch(console.error);
      localStorage.setItem('cache_workgroups', JSON.stringify(updated));
    }
  }, [workGroups]);

  // Trigger employee number prompt if missing
  useEffect(() => {
    if (currentUser && !currentUser.employeeNumber && currentUser.role !== Role.ADMIN) {
      setShowEmployeePrompt(true);
    } else {
      setShowEmployeePrompt(false);
    }
  }, [currentUser]);

  // Prime audio to unlock playback on first user interaction
  useEffect(() => {
    const unlockAudio = () => {
      const audio = new Audio("data:audio/wav;base64,UklGRigAAABXQVZFRm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAAAD");
      audio.play().then(() => {
        window.removeEventListener('click', unlockAudio);
        window.removeEventListener('touchstart', unlockAudio);
      }).catch(() => {});
    };
    window.addEventListener('click', unlockAudio);
    window.addEventListener('touchstart', unlockAudio);
    return () => {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
  }, []);

  useEffect(() => {
    dataSyncService.getApiClient().request<User>('/me').then(user => {
      setCurrentUser(user);
      setIsGuest(false);
      localStorage.removeItem('authToken');
    }).catch(() => setError('Cloudflare Access login is required. Check the Access application and Worker configuration.'));
  }, []);

  // Global subscriptions via DataSyncService
  useEffect(() => {
    const unsubUsers = dataSyncService.subscribeUsers((data) => {
      setUsers(data);
      setLoading(false);
    });

    const unsubArtisans = dataSyncService.subscribeArtisans((data) => setArtisans(data));
    const unsubOps = dataSyncService.subscribeOperators((data) => setOperators(data));
    const unsubAdminMessages = dataSyncService.subscribeAdminMessages((data) => setAdminMessages(data));
    const unsubJobTickets = dataSyncService.subscribeJobTickets((data) => setJobTickets(data));

    fetchAndCacheStaticData();

    // Safe auto-migration of existing local storage records to Cloudflare D1
    /* Migration is now an explicit administrator action.
    dataSyncService.migrateLocalDataToRemote().catch(e => {
      console.warn('Initial D1 migration background sync:', e);
    }); */

    return () => {
      unsubUsers();
      unsubArtisans();
      unsubOps();
      unsubAdminMessages();
      unsubJobTickets();
    };
  }, [fetchAndCacheStaticData]);

  // Real-time listener for audit logs — Admin only
  useEffect(() => {
    if (currentUser?.role !== Role.ADMIN) {
      setAuditLogs([]);
      return;
    }
    const unsubscribe = dataSyncService.subscribeAuditLogs((logs) => setAuditLogs(logs));
    return () => unsubscribe();
  }, [currentUser?.id, currentUser?.role]);

  const [extraHours, setExtraHours] = useState(0);
  const [reportLimit, setReportLimit] = useState(200);

  // Reports subscription
  useEffect(() => {
    if (!currentUser && !isGuest) {
      setLoading(false);
      return;
    }
    const hours = Math.max(36, (currentUser?.hoursToShow || 12) + extraHours);
    const unsubscribe = dataSyncService.subscribeReports(hours, reportLimit, (data) => {
      setReports(data);
      setLoading(false);
      setError(null);
    });
    return () => unsubscribe();
  }, [currentUser?.id, currentUser?.hoursToShow, extraHours, reportLimit, isGuest]);

  const loadMoreReports = useCallback(() => {
    setExtraHours(prev => prev + 24);
    setReportLimit(prev => prev + 50);
  }, []);

  const handleLogin = async (_userId: string) => {
    const user = await dataSyncService.getApiClient().request<User>('/me');
    setCurrentUser(user);
    setIsGuest(false);
  };

  const handleGuestAccess = () => {
    setIsGuest(true);
    setCurrentUser(null);
  };

  const handleRegister = async (userData: Omit<User, 'id'>) => {
    const newId = `user-${Math.random().toString(36).substring(2, 10)}`;
    const newUser: User = { ...userData, id: newId, uid: newId, roles: [userData.role] };
    await dataSyncService.saveUser(newUser);
    const cachedUsers = JSON.parse(localStorage.getItem('cache_users') || JSON.stringify(USERS));
    cachedUsers.push(newUser);
    localStorage.setItem('cache_users', JSON.stringify(cachedUsers));
    setUsers(cachedUsers);
    handleLogin(newId);
  };

  const switchRole = async (userId: string, newRole: Role) => {
    let disciplineUpdate: string | undefined = undefined;
    if (newRole === Role.ELEC_SUPERVISOR) disciplineUpdate = 'Electrical';
    else if (newRole === Role.MECH_SUPERVISOR) disciplineUpdate = 'Mechanical';
    else if (newRole === Role.TECH_SUPERVISOR) disciplineUpdate = 'Technicians';
    else if (newRole === Role.INST_SUPERVISOR) disciplineUpdate = 'Instrumentation';

    setUsers(prevUsers => prevUsers.map(u => {
      if (u.id === userId) {
        const updated = { 
          ...u, 
          role: newRole,
          ...(disciplineUpdate ? { discipline: disciplineUpdate } : {})
        };
        if (currentUser?.id === userId) {
          setCurrentUser(updated);
        }
        return updated;
      }
      return u;
    }));

    const cached = JSON.parse(localStorage.getItem('cache_users') || JSON.stringify(USERS));
    const updated = cached.map((u: User) => {
      if (u.id === userId) {
        return { ...u, role: newRole, ...(disciplineUpdate ? { discipline: disciplineUpdate } : {}) };
      }
      return u;
    });
    localStorage.setItem('cache_users', JSON.stringify(updated));
  };

  const handleLogout = async () => {
    window.location.assign('/cdn-cgi/access/logout');
    setCurrentUser(null);
    setIsGuest(false);
    localStorage.removeItem('loggedUserId');
  };

  const handleShiftChange = (shift: Shift) => {
    setCurrentShift(shift);
    if (currentUser) {
      updateUser(currentUser.id, { shift });
      setCurrentUser(prev => prev ? { ...prev, shift } : null);
    }
  };

  const createNotifications = async (message: string, recipientIds: string[], relatedReportId?: string) => {
    await dataSyncService.createNotifications(message, recipientIds, relatedReportId);
  };

  const addReport = async (reportData: Omit<BreakdownReport, 'id' | 'reportingTime' | 'reporter' | 'status'>, employeeNumber?: string) => {
    if (!currentUser) return;
    const reportId = await dataSyncService.addReport(currentUser, reportData, employeeNumber);
    await addAuditLog('CREATE', 'REPORT', reportId, 'Created report');
    const managementIds = users.filter(u => [Role.SCHEDULER, Role.ADMIN, Role.COORDINATOR, Role.FOREMAN, Role.OPS_FOREMAN].includes(u.role)).map(u => u.id);
    await createNotifications(`New breakdown: ${reportData.equipment}`, managementIds, reportId);
  };

  const duplicateReport = async (reportId: string) => {
    if (!currentUser) return;
    try {
      const newId = await dataSyncService.duplicateReport(currentUser, reportId, reports);
      if (newId) {
        await addAuditLog('CREATE', 'REPORT', newId, 'Duplicated from ' + reportId);
        const managementIds = users.filter(u => [Role.SCHEDULER, Role.ADMIN, Role.COORDINATOR, Role.FOREMAN, Role.OPS_FOREMAN].includes(u.role)).map(u => u.id);
        const original = reports.find(r => r.id === reportId);
        await createNotifications(`Re-reported: ${original?.equipment || 'Equipment'}`, managementIds, newId);
      }
    } catch (e: any) {
      alert(e.message || "Could not duplicate report.");
    }
  };

  const addAuditLog = async (action: 'CREATE' | 'UPDATE' | 'DELETE', entityType: string, entityId: string, details: string) => {
    if (!currentUser) return;
    await dataSyncService.addAuditLog(currentUser, action, entityType, entityId, details);
  };

  const updateReport = async (reportId: string, updates: Partial<BreakdownReport>) => {
    try {
      if (currentUser) {
        await dataSyncService.updateReport(currentUser, reportId, updates);
      }
      setReports(prev => prev.map(r => r.id === reportId ? { ...r, ...updates } : r));
      await addAuditLog('UPDATE', 'REPORT', reportId, JSON.stringify(updates));
    } catch (err: any) {
      console.error('Remote update failed:', err);
      setError(`Failed to update report on remote database: ${err.message}`);
      throw err;
    }
  };

  const deleteReport = async (reportId: string) => {
    try {
      await dataSyncService.deleteReport(reportId);
      setReports(prev => prev.filter(r => r.id !== reportId));
      await addAuditLog('DELETE', 'REPORT', reportId, 'Deleted report');
    } catch (err: any) {
      console.error('Remote delete failed:', err);
      setError(`Failed to delete report on remote database: ${err.message}`);
      throw err;
    }
  };

  const clearAllReports = async () => {
    localStorage.setItem('cache_reports', JSON.stringify([]));
    setReports([]);
  };

  const purgeOldReports = async (cutoffDate: string) => {
    try {
      const count = await dataSyncService.purgeOldReports(cutoffDate);
      setReports(prev => prev.filter(r => new Date(r.reportingTime) >= new Date(cutoffDate)));
      return count;
    } catch (err: any) {
      console.error('Remote purge failed:', err);
      throw err;
    }
  };

  const updateUser = async (userId: string, updates: Partial<User>) => {
    const cached = JSON.parse(localStorage.getItem('cache_users') || JSON.stringify(USERS));

    if (currentUser?.role === Role.SCHEDULER) {
      const target = cached.find((u: User) => u.id === userId);
      const keys = Object.keys(updates);
      const isPasswordReset = keys.length === 1 && keys[0] === 'password';
      const isSelfUpdate =
        currentUser?.id === userId &&
        !('role' in updates) &&
        !('roles' in updates) &&
        !('isApproved' in updates);
      const isApproval =
        target &&
        target.isApproved === false &&
        updates.isApproved === true &&
        keys.length === 1 &&
        SCHEDULER_APPROVABLE_ROLES.includes(target.role);

      if (!isPasswordReset && !isApproval && !isSelfUpdate) {
        console.warn('Scheduler is not permitted to make this user change.');
        return;
      }
    }

    if (updates.hoursToShow !== undefined || updates.notificationSound !== undefined) {
      const key = `prefs_${userId}`;
      let prefs: any = {};
      const existing = localStorage.getItem(key);
      if (existing) {
        try { prefs = JSON.parse(existing); } catch (e) {}
      }
      if (updates.hoursToShow !== undefined) prefs.hoursToShow = updates.hoursToShow;
      if (updates.notificationSound !== undefined) prefs.notificationSound = updates.notificationSound;
      localStorage.setItem(key, JSON.stringify(prefs));
    }

    const targetUser = cached.find((u: User) => u.id === userId);
    if (targetUser) {
      const updatedUser = { ...targetUser, ...updates };
      try {
        await dataSyncService.saveUser(updatedUser);
      } catch (e) {
        console.warn('Remote user save error:', e);
      }
    }

    const updated = cached.map((u: User) => u.id === userId ? { ...u, ...updates } : u);
    localStorage.setItem('cache_users', JSON.stringify(updated));
    setUsers(updated);
    if (currentUser?.id === userId) {
      setCurrentUser(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  const deleteUser = async (userId: string) => {
    const cached = JSON.parse(localStorage.getItem('cache_users') || '[]');

    if (currentUser?.role === Role.SCHEDULER) {
      const target = cached.find((u: User) => u.id === userId);
      const canDenyRequest =
        target &&
        target.isApproved === false &&
        SCHEDULER_APPROVABLE_ROLES.includes(target.role);
      if (!canDenyRequest) {
        console.warn('Scheduler is not permitted to delete this user.');
        return;
      }
    }

    try {
      await dataSyncService.deleteUser(userId);
    } catch (e) {
      console.warn('Remote user delete error:', e);
    }

    const updated = cached.filter((u: User) => u.id !== userId);
    localStorage.setItem('cache_users', JSON.stringify(updated));
    setUsers(updated);
  };

  const addWorkGroup = async (name: string, color?: string) => {
    const id = `wg-${Date.now()}`;
    const cached = JSON.parse(localStorage.getItem('cache_workgroups') || JSON.stringify(INITIAL_WORK_GROUPS));
    cached.push({ id, name, ...(color ? { color } : {}) });
    await saveSharedList('workgroups', cached);
    localStorage.setItem('cache_workgroups', JSON.stringify(cached));
    setWorkGroups(cached);
  };

  const updateWorkGroup = async (id: string, updates: Partial<WorkGroup>) => {
    const cached = JSON.parse(localStorage.getItem('cache_workgroups') || '[]');
    const updated = cached.map((w: WorkGroup) => w.id === id ? { ...w, ...updates } : w);
    await saveSharedList('workgroups', updated);
    localStorage.setItem('cache_workgroups', JSON.stringify(updated));
    setWorkGroups(updated);
  };

  const deleteWorkGroup = async (id: string) => {
    const cached = JSON.parse(localStorage.getItem('cache_workgroups') || '[]');
    const updated = cached.filter((w: WorkGroup) => w.id !== id);
    await saveSharedList('workgroups', updated);
    localStorage.setItem('cache_workgroups', JSON.stringify(updated));
    setWorkGroups(updated);
  };

  const addArtisan = async (data: Omit<Artisan, 'id'>) => {
    const id = `art-${Date.now()}`;
    const cached = JSON.parse(localStorage.getItem('cache_artisans') || JSON.stringify(INITIAL_ARTISANS));
    cached.push({ id, ...data });
    localStorage.setItem('cache_artisans', JSON.stringify(cached));
    setArtisans(cached);
  };

  const updateArtisan = async (id: string, updates: Partial<Artisan>) => {
    const cached = JSON.parse(localStorage.getItem('cache_artisans') || '[]');
    const updated = cached.map((a: Artisan) => a.id === id ? { ...a, ...updates } : a);
    localStorage.setItem('cache_artisans', JSON.stringify(updated));
    setArtisans(updated);
  };

  const deleteArtisan = async (id: string) => {
    const cached = JSON.parse(localStorage.getItem('cache_artisans') || '[]');
    const updated = cached.filter((a: Artisan) => a.id !== id);
    localStorage.setItem('cache_artisans', JSON.stringify(updated));
    setArtisans(updated);
  };

  const addOperator = async (name: string, shift: Shift, workGroup?: string, employeeNumber?: string) => {
    if (!currentUser) return;
    const id = `op-${Date.now()}`;
    const newOp: Operator = {
      id,
      name,
      shift,
      workGroup: workGroup || currentUser.workGroup || null,
      addedByUid: currentUser.id,
      employeeNumber: employeeNumber || null
    };
    const cached = JSON.parse(localStorage.getItem('cache_operators') || '[]');
    cached.push(newOp);
    await saveSharedList('operators', cached);
    localStorage.setItem('cache_operators', JSON.stringify(cached));
    setOperators(cached);
  };

  const updateOperator = async (id: string, updates: Partial<Operator>) => {
    const cached = JSON.parse(localStorage.getItem('cache_operators') || '[]');
    const updated = cached.map((o: Operator) => o.id === id ? { ...o, ...updates } : o);
    await saveSharedList('operators', updated);
    localStorage.setItem('cache_operators', JSON.stringify(updated));
    setOperators(updated);
  };

  const deleteOperator = async (id: string) => {
    const cached = JSON.parse(localStorage.getItem('cache_operators') || '[]');
    const updated = cached.filter((o: Operator) => o.id !== id);
    await saveSharedList('operators', updated);
    localStorage.setItem('cache_operators', JSON.stringify(updated));
    setOperators(updated);
  };

  const addResolutionStatus = async (name: string) => {
    const id = `rs-${Date.now()}`;
    const cached = JSON.parse(localStorage.getItem('cache_resolutionStatuses') || JSON.stringify(DEFAULT_RESOLUTION_STATUSES));
    cached.push({ id, name });
    await saveSharedList('resolutionStatuses', cached);
    localStorage.setItem('cache_resolutionStatuses', JSON.stringify(cached));
    setResolutionStatuses(cached);
  };

  const updateResolutionStatus = async (id: string, updates: Partial<ResolutionStatusItem>) => {
    const cached = JSON.parse(localStorage.getItem('cache_resolutionStatuses') || '[]');
    const updated = cached.map((rs: ResolutionStatusItem) => rs.id === id ? { ...rs, ...updates } : rs);
    await saveSharedList('resolutionStatuses', updated);
    localStorage.setItem('cache_resolutionStatuses', JSON.stringify(updated));
    setResolutionStatuses(updated);
  };

  const deleteResolutionStatus = async (id: string) => {
    const cached = JSON.parse(localStorage.getItem('cache_resolutionStatuses') || '[]');
    const updated = cached.filter((rs: ResolutionStatusItem) => rs.id !== id);
    await saveSharedList('resolutionStatuses', updated);
    localStorage.setItem('cache_resolutionStatuses', JSON.stringify(updated));
    setResolutionStatuses(updated);
  };

  const addSection = async (name: string, targetRole?: Role, color?: string) => {
    const id = `sec-${Date.now()}`;
    const cached = JSON.parse(localStorage.getItem('cache_sections') || '[]');
    cached.push({ id, name, targetRole: targetRole || null, ...(color ? { color } : {}) });
    await saveSharedList('sections', cached);
    localStorage.setItem('cache_sections', JSON.stringify(cached));
    setSections(cached);
  };

  const updateSection = async (id: string, updates: Partial<HandoverSection>) => {
    const cached = JSON.parse(localStorage.getItem('cache_sections') || '[]');
    const updated = cached.map((s: HandoverSection) => s.id === id ? { ...s, ...updates } : s);
    await saveSharedList('sections', updated);
    localStorage.setItem('cache_sections', JSON.stringify(updated));
    setSections(updated);
  };

  const deleteSection = async (id: string) => {
    const cached = JSON.parse(localStorage.getItem('cache_sections') || '[]');
    const updated = cached.filter((s: HandoverSection) => s.id !== id);
    await saveSharedList('sections', updated);
    localStorage.setItem('cache_sections', JSON.stringify(updated));
    setSections(updated);
  };

  const addAdminMessage = async (
    category: string, 
    content: string, 
    wantsReply: boolean,
    recipientType: 'admin' | 'scheduler' | 'all' | 'role' | 'shift' | 'area' | 'individuals' = 'admin',
    targetRole?: string,
    targetShift?: string,
    targetArea?: string,
    targetUserIds?: string[]
  ) => {
    if (!currentUser) return;
    const id = `msg-${Date.now()}`;
    const newMsg: UserMessage = {
      id,
      senderId: currentUser.id,
      senderName: currentUser.name,
      category,
      content,
      wantsReply,
      timestamp: new Date().toISOString(),
      isReadByAdmin: false,
      recipientType,
      targetRole: targetRole || null,
      targetShift: targetShift || null,
      targetArea: targetArea || null,
      targetUserIds: targetUserIds || null,
      acknowledgedBy: []
    };
    const cached = JSON.parse(localStorage.getItem('cache_adminMessages') || '[]');
    cached.unshift(newMsg);
    localStorage.setItem('cache_adminMessages', JSON.stringify(cached));
    setAdminMessages(cached);
  };

  const acknowledgeMessage = async (messageId: string, userId: string) => {
    const cached = JSON.parse(localStorage.getItem('cache_adminMessages') || '[]');
    const updated = cached.map((m: UserMessage) => {
      if (m.id === messageId) {
        const ackBy = m.acknowledgedBy || [];
        if (!ackBy.includes(userId)) {
          return { ...m, acknowledgedBy: [...ackBy, userId] };
        }
      }
      return m;
    });
    localStorage.setItem('cache_adminMessages', JSON.stringify(updated));
    setAdminMessages(updated);
  };

  const markAdminMessageRead = async (id: string, isRead: boolean) => {
    const cached = JSON.parse(localStorage.getItem('cache_adminMessages') || '[]');
    const updated = cached.map((m: UserMessage) => m.id === id ? { ...m, isReadByAdmin: isRead } : m);
    localStorage.setItem('cache_adminMessages', JSON.stringify(updated));
    setAdminMessages(updated);
  };

  const updateAdminMessage = async (id: string, updates: Partial<UserMessage>) => {
    const cached = JSON.parse(localStorage.getItem('cache_adminMessages') || '[]');
    const updated = cached.map((m: UserMessage) => m.id === id ? { ...m, ...updates } : m);
    localStorage.setItem('cache_adminMessages', JSON.stringify(updated));
    setAdminMessages(updated);
  };

  const deleteAdminMessage = async (id: string) => {
    const cached = JSON.parse(localStorage.getItem('cache_adminMessages') || '[]');
    const updated = cached.filter((m: UserMessage) => m.id !== id);
    localStorage.setItem('cache_adminMessages', JSON.stringify(updated));
    setAdminMessages(updated);
  };

  const handleBulkUpload = async (type: 'users' | 'artisans' | 'operators', data: any[]) => {
    if (!currentUser) return;
    const key = `cache_${type}`;
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    const newItems = data.map(item => ({
      id: item.id || `${type.slice(0, 3)}-${Math.random().toString(36).substring(2, 10)}`,
      ...item,
      ...(type === 'operators' && !item.workGroup && currentUser.workGroup ? { workGroup: currentUser.workGroup } : {}),
      ...(type === 'operators' && !item.addedByUid ? { addedByUid: currentUser.id } : {})
    }));
    const combined = [...existing, ...newItems];
    localStorage.setItem(key, JSON.stringify(combined));
    if (type === 'users') setUsers(combined);
    if (type === 'artisans') setArtisans(combined);
    if (type === 'operators') setOperators(combined);
  };

  if (loading) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Loading...</div>;
  
  if (!currentUser && !isGuest) {
    return (
      <div className="relative min-h-screen pb-8">
        <div className="p-12 text-center text-white bg-gray-900 min-h-screen">
          <h1 className="text-2xl mb-4">Sign in with Cloudflare Access</h1>
          <p>{error || 'Your Cloudflare Access session is required.'}</p>
          <button className="mt-6 p-3 bg-blue-600 rounded" onClick={() => window.location.reload()}>Continue to sign in</button>
        </div>
        <AppFooter />
        <OfflineIndicator />
      </div>
    );
  }

  const guestUser: User = {
    id: 'guest',
    name: 'Guest Viewer',
    role: Role.GUEST,
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 print:min-h-min print:block print:bg-white print:text-black">
      <Dashboard
        auditLogs={auditLogs}
        user={currentUser || guestUser}
        reports={reports}
        loadMoreReports={loadMoreReports}
        users={users}
        workGroups={workGroups}
        artisans={artisans}
        filteredArtisans={artisans.filter(a => a.shift === currentShift)}
        currentShift={currentShift}
        onShiftChange={handleShiftChange}
        onLogout={handleLogout}
        addReport={addReport}
        updateReport={updateReport}
        duplicateReport={duplicateReport}
        deleteReport={deleteReport}
        clearAllReports={clearAllReports}
        purgeOldReports={purgeOldReports}
        updateUser={updateUser}
        deleteUser={deleteUser}
        addWorkGroup={addWorkGroup}
        updateWorkGroup={updateWorkGroup}
        deleteWorkGroup={deleteWorkGroup}
        addArtisan={addArtisan}
        updateArtisan={updateArtisan}
        deleteArtisan={deleteArtisan}
        operators={operators}
        addOperator={addOperator}
        updateOperator={updateOperator}
        deleteOperator={deleteOperator}
        switchRole={switchRole}
        resolutionStatuses={resolutionStatuses}
        addResolutionStatus={addResolutionStatus}
        updateResolutionStatus={updateResolutionStatus}
        deleteResolutionStatus={deleteResolutionStatus}
        sections={sections}
        addSection={addSection}
        updateSection={updateSection}
        deleteSection={deleteSection}
        adminMessages={adminMessages}
        addAdminMessage={addAdminMessage}
        updateAdminMessage={updateAdminMessage}
        markAdminMessageRead={markAdminMessageRead}
        deleteAdminMessage={deleteAdminMessage}
        acknowledgeMessage={acknowledgeMessage}
        onBulkUpload={handleBulkUpload}
        tickets={jobTickets}
        onRefreshStaticData={fetchAndCacheStaticData}
        onLockTerminal={() => setIsTerminalLocked(true)}
      />
      <AppFooter />
      <OfflineIndicator />
      <EmployeeNumberModal 
        isOpen={showEmployeePrompt} 
        onClose={() => setShowEmployeePrompt(false)} 
        currentName={currentUser?.name || ''}
        onSubmit={(num) => updateUser(currentUser!.id, { employeeNumber: num })}
      />

      {/* Control Room Terminal Lock Overlay */}
      {isTerminalLocked && currentUser && (
        <div className="fixed inset-0 z-[100] bg-gray-950/95 backdrop-blur-lg flex items-center justify-center p-4">
          <div className="bg-gray-900 border-2 border-red-500/70 rounded-3xl p-8 max-w-md w-full shadow-2xl text-center space-y-5 animate-in fade-in">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-red-950/80 border border-red-500/50 flex items-center justify-center text-3xl shadow-lg shadow-red-950/50">
              🔒
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-red-400 bg-red-950/80 px-2.5 py-1 rounded-full border border-red-700/50">
                Plant Terminal Locked
              </span>
              <h2 className="text-xl font-black text-white mt-2">Active Session: {currentUser.name}</h2>
              <p className="text-xs text-gray-400 mt-1">
                {currentUser.role} {currentUser.workGroup ? `• ${currentUser.workGroup}` : ''} {currentUser.shift ? `• Shift ${currentUser.shift}` : ''}
              </p>
            </div>

            <p className="text-xs text-gray-300 bg-gray-800/80 border border-gray-700 rounded-xl p-3 text-left">
              Workstation secured against unauthorized shift handover, dispatch alterations, or lockout overrides. Verify identity to resume.
            </p>

            {unlockError && (
              <div className="bg-red-900/60 border border-red-500 text-xs text-red-200 p-2.5 rounded-xl">
                {unlockError}
              </div>
            )}

            <div className="space-y-3">
              <button
                type="button"
                disabled={unlockLoading}
                onClick={async () => {
                  setUnlockLoading(true);
                  setUnlockError('');
                  try {
                    const res = await authenticateWithWindowsHello(currentUser);
                    if (res.success) {
                      setIsTerminalLocked(false);
                      setUnlockSecret('');
                    } else {
                      setUnlockError(res.error || 'Windows Hello verification failed. Please enter your PIN or Password.');
                    }
                  } catch (err: any) {
                    setUnlockError(err.message || 'Verification failed');
                  } finally {
                    setUnlockLoading(false);
                  }
                }}
                className="w-full bg-[#1e293b] hover:bg-[#334155] border border-blue-500/60 hover:border-blue-400 text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2.5 shadow-lg transition cursor-pointer"
              >
                <svg className="w-4 h-4 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
                </svg>
                <span>{unlockLoading ? 'Verifying with Windows...' : 'Unlock with Windows Hello (Biometrics / PIN)'}</span>
              </button>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const verify = verifyUserCredentials(currentUser, unlockSecret);
                  if (verify.valid) {
                    setIsTerminalLocked(false);
                    setUnlockSecret('');
                    setUnlockError('');
                  } else {
                    setUnlockError(verify.reason || 'Invalid PIN or Password.');
                  }
                }}
                className="flex gap-2"
              >
                <input
                  type="password"
                  value={unlockSecret}
                  onChange={(e) => setUnlockSecret(e.target.value)}
                  placeholder="Or enter PIN / Password (Default: Password1)"
                  className="flex-1 bg-gray-800 border border-gray-600 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-red-400 focus:outline-none"
                  autoFocus
                />
                <button
                  type="submit"
                  className="bg-red-600 hover:bg-red-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow"
                >
                  Unlock
                </button>
              </form>
            </div>

            <div className="pt-2 border-t border-gray-800">
              <button
                type="button"
                onClick={() => {
                  setIsTerminalLocked(false);
                  setUnlockSecret('');
                  setUnlockError('');
                  handleLogout();
                }}
                className="text-gray-400 hover:text-white text-xs font-semibold"
              >
                Sign Out / Switch Operator
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const App: React.FC = () => {
  const [currentPath, setCurrentPath] = useState(() => {
    return typeof window !== 'undefined' ? window.location.pathname.toLowerCase() : '/';
  });

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname.toLowerCase());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const isFieldReportRoute = currentPath.startsWith('/field-report') || (searchParams && searchParams.get('view') === 'field-report');

  if (isFieldReportRoute) {
    return <FieldReportPortal />;
  }

  return <BdrMainApp />;
};

export default App;
