import CommentsModal from './modals/CommentsModal';
import EquipmentOverviewModal from './modals/EquipmentOverviewModal';
import EquipmentQRModal from './modals/EquipmentQRModal';

import React, { useState, useMemo, useEffect } from 'react';
import { User, BreakdownReport, Role, WorkGroup, Artisan, Shift, Status, AppView, ResolutionStatusItem, Operator, UserMessage, AuditLogEntry, HandoverSection, JobTicket } from '../types';
import { AlertTriangle, Lock, ShieldAlert, Edit3, CheckCircle2, Trash2, Volume2 } from 'lucide-react';
import { getProductionDayStart, getProductionDayEnd, isMaintenanceForeman, getUserDiscipline, matchesDisciplineHandover } from '../utils';
import Header from './Header';
import ReporterView from './ReporterView';
import CoordinatorView from './CoordinatorView';
import SummaryView from './SummaryView';
import AdminView from './AdminView';
import DailyReportView from './DailyReportView';
import HistoryView from './HistoryView';
import AboutView from './AboutView';
import HandOverReportView from './HandOverReportView';
import MessageAdminModal from './modals/MessageAdminModal';
import EditReportModal from './modals/EditReportModal';
import { JobTicketsView } from './JobTicketsView';
import { MeetingOverviewView } from './MeetingOverviewView';
import KanbanBoardView from './KanbanBoardView';
import { GalleryView } from './GalleryView';
import { lockoutService } from '../services/lockoutService';

interface DashboardProps {
  auditLogs: AuditLogEntry[];
  user: User;
  reports: BreakdownReport[];
  loadMoreReports?: () => void;
  users: User[];
  workGroups: WorkGroup[];
  artisans: Artisan[];
  filteredArtisans: Artisan[];
  currentShift: Shift;
  onShiftChange: (shift: Shift) => void;
  onLogout: () => void;
  addReport: (reportData: Omit<BreakdownReport, 'id' | 'reportingTime' | 'reporter' | 'status'>, employeeNumber?: string) => void;
  updateReport: (reportId: string, updates: Partial<BreakdownReport>) => void;
  duplicateReport: (reportId: string) => void;
  deleteReport: (reportId: string) => void;
  clearAllReports: () => void;
  purgeOldReports: (cutoff: string) => Promise<number>;
  updateUser: (userId: string, updates: Partial<User>) => void;
  deleteUser: (userId: string) => void;
  addWorkGroup: (name: string) => void;
  updateWorkGroup: (workGroupId: string, updates: Partial<WorkGroup>) => void;
  deleteWorkGroup: (workGroupId: string) => void;
  addArtisan: (artisanData: Omit<Artisan, 'id'>) => void;
  updateArtisan: (artisanId: string, updates: Partial<Artisan>) => void;
  deleteArtisan: (artisanId: string) => void;
  resolutionStatuses: ResolutionStatusItem[];
  addResolutionStatus: (name: string) => void;
  updateResolutionStatus: (id: string, updates: Partial<ResolutionStatusItem>) => void;
  deleteResolutionStatus: (id: string) => void;
  sections?: HandoverSection[];
  addSection?: (name: string) => void;
  updateSection?: (id: string, updates: { name: string }) => void;
  deleteSection?: (id: string) => void;
  adminMessages: UserMessage[];
  addAdminMessage: (category: string, content: string, wantsReply: boolean) => Promise<void>;
  updateAdminMessage: (id: string, updates: Partial<UserMessage>) => Promise<void>;
  markAdminMessageRead: (id: string, isRead: boolean) => Promise<void>;
  deleteAdminMessage: (id: string) => Promise<void>;
  onBulkUpload?: (type: 'users' | 'artisans' | 'operators', data: any[]) => Promise<void>;
  operators: Operator[];
  addOperator: (name: string, shift: Shift, workGroup?: string) => void;
  updateOperator: (id: string, updates: Partial<Operator>) => void;
  deleteOperator: (id: string) => void;
  switchRole: (userId: string, newRole: Role) => void;
  acknowledgeMessage?: (messageId: string, userId: string) => Promise<void>;
  tickets: JobTicket[];
  onRefreshStaticData?: () => Promise<void>;
  onLockTerminal?: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({
  auditLogs, 
    user, reports, loadMoreReports, users, workGroups, artisans, filteredArtisans, currentShift, onShiftChange, onLogout, addReport, updateReport, duplicateReport,
    deleteReport, clearAllReports, purgeOldReports, updateUser, deleteUser,
    addWorkGroup, updateWorkGroup, deleteWorkGroup,
    addArtisan, updateArtisan, deleteArtisan,
    resolutionStatuses, addResolutionStatus, updateResolutionStatus, deleteResolutionStatus,
    sections = [], addSection = () => {}, updateSection = () => {}, deleteSection = () => {},


    operators, addOperator, updateOperator, deleteOperator,
    adminMessages, addAdminMessage, updateAdminMessage, markAdminMessageRead, deleteAdminMessage,
    switchRole,
    acknowledgeMessage,
    onBulkUpload,
    tickets = [],
    onRefreshStaticData,
    onLockTerminal
}) => {
  const [isCommentsModalOpen, setIsCommentsModalOpen] = useState(false);
  const [commentsReport, setCommentsReport] = useState<BreakdownReport | null>(null);
  const handleOpenComments = (report: BreakdownReport) => {
    setCommentsReport(report);
    setIsCommentsModalOpen(true);
  };

  const [isEquipmentOverviewOpen, setIsEquipmentOverviewOpen] = useState(false);
  const [overviewReport, setOverviewReport] = useState<BreakdownReport | null>(null);
  
  const handleOpenEquipmentOverview = (report: BreakdownReport) => {
    setOverviewReport(report);
    setIsEquipmentOverviewOpen(true);
  };

  useEffect(() => {
    (window as any).openEquipmentOverview = handleOpenEquipmentOverview;
    (window as any).navigateToGallery = (reportId: string) => {
      localStorage.setItem('gallery_target_report_id', reportId);
      setCurrentView('gallery');
    };
    const handleNavigateView = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.view) {
        setCurrentView(customEvent.detail.view);
      }
      const focusId = customEvent.detail?.focusId;
      if (focusId) {
        setTimeout(() => {
          const el = document.getElementById(focusId);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('ring-2', 'ring-amber-400');
            setTimeout(() => el.classList.remove('ring-2', 'ring-amber-400'), 2500);
          }
        }, 350);
      }
      const ticketId = customEvent.detail?.ticketId;
      if (ticketId) {
        setFocusedTicketId(ticketId);
        setCurrentView('tickets');
      }
    };
    window.addEventListener('navigate_view', handleNavigateView);
    return () => {
      delete (window as any).openEquipmentOverview;
      delete (window as any).navigateToGallery;
      window.removeEventListener('navigate_view', handleNavigateView);
    };
  }, []);

  const [currentView, setCurrentView] = useState<AppView>('dashboard');
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [selectedImagePreview, setSelectedImagePreview] = useState<string | null>(null);
  const [reportToEdit, setReportToEdit] = useState<BreakdownReport | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [focusedTicketId, setFocusedTicketId] = useState<string | null>(null);
  const [acknowledgedJobCards, setAcknowledgedJobCards] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`acknowledged_job_cards_${user.id}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(`acknowledged_job_cards_${user.id}`, JSON.stringify(acknowledgedJobCards));
    } catch (e) {}
  }, [acknowledgedJobCards, user.id]);

  // Local state to instantly clear message popups on the frontend
  const [localAcks, setLocalAcks] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('local_acknowledged_messages');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const trackLocalAck = (messageId: string) => {
    setLocalAcks(prev => {
      if (prev.includes(messageId)) return prev;
      const next = [...prev, messageId];
      try {
        localStorage.setItem('local_acknowledged_messages', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  // Parse all unacknowledged broadcasts and targeted user alerts
  const unacknowledgedMessages = useMemo(() => {
    if (!user || user.role === Role.GUEST || user.id === 'guest') return [];
    
    const userAckList = user.acknowledgedMessages || [];

    return adminMessages.filter(m => {
      // Don't target yourself
      if (m.senderId === user.id) return false;
      
      // If already acknowledged (via Firestore list, user profile list, or local state / localStorage tracking list), skip
      if (
        m.acknowledgedBy?.includes(user.id) || 
        userAckList.includes(m.id) ||
        localAcks.includes(m.id)
      ) {
         return false;
      }

      // Match target criteria
      const recType = m.recipientType;
      if (recType === 'all') return true;
      if (recType === 'role' && m.targetRole === user.role) return true;
      if (recType === 'shift' && m.targetShift === user.shift) return true;
      if (recType === 'area' && m.targetArea === user.workGroup) return true;
      if (recType === 'individuals' && m.targetUserIds?.includes(user.id)) return true;

      return false;
    });
  }, [adminMessages, user, localAcks]);

  const activeAlert = unacknowledgedMessages[0];
  
  const activeDashboardReports = useMemo(() => {
    const productionDayStart = getProductionDayStart(new Date());
    const productionDayEnd = getProductionDayEnd(productionDayStart);
    
    return reports.filter(r => {
        const isPendingHandover = (r.resolutionStatus === 'Given to dayshift' || r.resolutionStatus === 'Hand Over' || r.isNextShift) && !r.dayshiftAcknowledged;
        if (r.status !== Status.COMPLETED || isPendingHandover) {
            return true;
        }
        const reportingTime = new Date(r.reportingTime);
        return reportingTime >= productionDayStart && reportingTime < productionDayEnd;
    });
  }, [reports]);

  // Field report drafts pending reporter verification
  const pendingDrafts = useMemo(() => {
    return reports.filter(r => 
      r.status === Status.DRAFT && 
      (!user.workGroup || user.workGroup === 'All' || r.workGroup.toLowerCase() === user.workGroup.toLowerCase())
    );
  }, [reports, user.workGroup]);

  // Incoming Lockout / Isolation Requests awaiting reporter approval
  const pendingLockouts = useMemo(() => {
    if (!tickets) return [];
    return tickets.filter(t => {
      const st = t.status || t.state;
      return st === 'LOCKOUT_REQUESTED' && 
        (!user.workGroup || user.workGroup === 'All' || (t.workGroup && t.workGroup.toLowerCase() === user.workGroup.toLowerCase()));
    });
  }, [tickets, user.workGroup]);

  // Area job cards (breakdowns/isolations) - only for reporters, hidden once acknowledged
  const areaJobCards = useMemo(() => {
    if (user.role !== Role.REPORTER) return [];
    if (!tickets) return [];
    return tickets.filter(t => {
      const st = t.status || t.state;
      if (st === 'RELEASED' || st === 'Returned' || st === 'REJECTED') return false;
      return (
        !acknowledgedJobCards.includes(t.id) &&
        (!user.workGroup || user.workGroup === 'All' || (t.workGroup && t.workGroup.toLowerCase() === user.workGroup.toLowerCase()))
      );
    });
  }, [tickets, user.workGroup, user.role, acknowledgedJobCards]);

  const acknowledgeJobCardNotification = (ticketId: string) => {
    setAcknowledgedJobCards(prev => prev.includes(ticketId) ? prev : [...prev, ticketId]);
    try {
      const cached = JSON.parse(localStorage.getItem('cache_notifications') || '[]');
      const updated = cached.map((n: any) =>
        n.relatedTicketId === ticketId ? { ...n, isRead: true } : n
      );
      localStorage.setItem('cache_notifications', JSON.stringify(updated));
    } catch (e) {}
  };

  const acknowledgeAllJobCardNotifications = () => {
    const ids = areaJobCards.map(t => t.id);
    if (ids.length === 0) return;
    setAcknowledgedJobCards(prev => Array.from(new Set([...prev, ...ids])));
    try {
      const cached = JSON.parse(localStorage.getItem('cache_notifications') || '[]');
      const updated = cached.map((n: any) =>
        ids.includes(n.relatedTicketId) ? { ...n, isRead: true } : n
      );
      localStorage.setItem('cache_notifications', JSON.stringify(updated));
    } catch (e) {}
  };

  // Handler: Approve draft report
  const handleApproveDraft = (draftId: string) => {
    const draft = reports.find(r => r.id === draftId);
    if (draft) {
      updateReport(draftId, {
        status: Status.ACTIVE,
        isDraft: false,
        changeLog: [...(draft.changeLog || []), { field: 'status', oldValue: Status.DRAFT, newValue: Status.ACTIVE, timestamp: new Date().toISOString(), changedBy: `${user.name} (Reporter Verified)` }]
      });
    }
  };

  // Handler: Reject/discard draft report
  const handleRejectDraft = (draftId: string) => {
    if (window.confirm('Are you sure you want to discard this draft? It will be removed from the system.')) {
      deleteReport(draftId);
    }
  };

  // Handler: Approve lockout request
  const handleApproveLockout = async (ticketId: string) => {
    try {
      await lockoutService.confirmPhysicalLockout(
        ticketId,
        user.id,
        user.name,
        user.employeeNumber || '0000',
        'Approved & activated by reporter'
      );
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert('Failed to approve lockout request.');
    }
  };

  // Handler: Reject lockout request
  const handleRejectLockout = async (ticketId: string) => {
    if (window.confirm('Are you sure you want to reject this lockout request?')) {
      try {
        await lockoutService.rejectLockout(
          ticketId,
          user.id,
          user.name,
          user.employeeNumber || '0000',
          'Rejected by reporter'
        );
        window.location.reload();
      } catch (err) {
        console.error(err);
        alert('Failed to reject lockout request.');
      }
    }
  };

  const openJobCard = (ticketId: string) => {
    setFocusedTicketId(ticketId);
    setCurrentView('tickets');
  };

  const { handOverReports, currentDayHandOverReports, olderHandOverReports } = useMemo(() => {
    const productionDayStart = getProductionDayStart(new Date());
    const allHandOver = reports
        .filter(r => {
            const isHandOverFlagged = r.resolutionStatus === 'Given to dayshift' || r.resolutionStatus === 'Hand Over' || r.isNextShift || !!r.handoverSection;
            const isStillActiveOrUnacked = r.status !== Status.COMPLETED || !r.dayshiftAcknowledged;
            return isHandOverFlagged && isStillActiveOrUnacked;
        })
        .sort((a, b) => new Date(b.reportingTime).getTime() - new Date(a.reportingTime).getTime());
    
    return {
        handOverReports: allHandOver,
        currentDayHandOverReports: allHandOver.filter(r => new Date(r.reportingTime) >= productionDayStart),
        olderHandOverReports: allHandOver.filter(r => new Date(r.reportingTime) < productionDayStart)
    };
  }, [reports]);

  const filteredOperators = useMemo(() => {
    if (user.role === Role.ADMIN) return operators;
    if (user.role === Role.SCHEDULER || user.role === Role.MECH_SUPERVISOR || user.role === Role.ELEC_SUPERVISOR || user.role === Role.TECH_SUPERVISOR || user.role === Role.INST_SUPERVISOR) return operators.filter(op => op.shift === currentShift);
    
    // Each area should only see their own team and selected shift
    return operators.filter(op => 
        op.workGroup === user.workGroup && op.shift === currentShift
    );
  }, [operators, user.role, user.workGroup, currentShift]);


  const renderMainView = () => {
    if (currentView === 'about') return <AboutView />;
    if (currentView === 'tickets') return <JobTicketsView user={user} reports={reports} tickets={tickets} workGroups={workGroups} initialTicketId={focusedTicketId} />;
    if (currentView === 'meeting') return <MeetingOverviewView user={user} reports={reports} tickets={tickets} workGroups={workGroups} sections={sections} addReport={addReport} updateReport={updateReport} />;
    if (currentView === 'kanban') return <KanbanBoardView user={user} reports={reports} updateReport={updateReport} onOpenComments={handleOpenComments} />;
    if (currentView === 'gallery') return <GalleryView reports={reports} user={user} workGroups={workGroups} updateReport={updateReport} />;
    if (currentView === 'reports') return <DailyReportView reports={reports} user={user} duplicateReport={duplicateReport} setCurrentView={setCurrentView} resolutionStatuses={resolutionStatuses} sections={sections} />;
    if (currentView === 'history') {
        if (user.role === Role.GUEST) return <div className="text-center py-20 text-gray-400">History view is restricted for guests.</div>;
        return <HistoryView reports={reports} user={user} duplicateReport={duplicateReport} setCurrentView={setCurrentView} resolutionStatuses={resolutionStatuses} workGroups={workGroups} />;
    }
    
    if (currentView === 'handover' && [Role.COORDINATOR, Role.SCHEDULER, Role.MECH_SUPERVISOR, Role.ELEC_SUPERVISOR, Role.TECH_SUPERVISOR, Role.INST_SUPERVISOR, Role.ADMIN, Role.FOREMAN, Role.OPS_FOREMAN, Role.GUEST].includes(user.role)) {
        return <HandOverReportView 
                    user={user}
                    reports={handOverReports}
                    artisans={filteredArtisans}
                    resolutionStatuses={resolutionStatuses}
                    sections={sections}
                    users={users}
                    workGroups={workGroups}
                    updateReport={updateReport}
                    duplicateReport={duplicateReport}
                />;
    }
    
    if (currentView === 'summary' && user.role !== Role.ADMIN) {
        return <SummaryView reports={activeDashboardReports} workGroups={workGroups} />;
    }

    switch (user.role) {
      case Role.ADMIN:
        return <AdminView
                    auditLogs={auditLogs} 
                    user={user} 
                    reports={reports} 
                    handOverReports={handOverReports}
                    users={users}
                    workGroups={workGroups}
                    artisans={artisans}
                    filteredArtisans={filteredArtisans}
                    resolutionStatuses={resolutionStatuses}
                    sections={sections}
                    addSection={addSection}
                    updateSection={updateSection}
                    deleteSection={deleteSection}
                    updateReport={updateReport}
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
                    addResolutionStatus={addResolutionStatus}
                    updateResolutionStatus={updateResolutionStatus}
                    deleteResolutionStatus={deleteResolutionStatus}
                    operators={operators}
                    addOperator={addOperator}
                    updateOperator={updateOperator}
                    deleteOperator={deleteOperator}
                    duplicateReport={duplicateReport}
                    adminMessages={adminMessages}
                    updateAdminMessage={updateAdminMessage}
                    markAdminMessageRead={markAdminMessageRead}
                    deleteAdminMessage={deleteAdminMessage}
                    onOpenMessages={() => setIsMessageModalOpen(true)}
                    onBulkUpload={onBulkUpload}
                    onRefreshStaticData={onRefreshStaticData}
                />;
      case Role.REPORTER:
        return <ReporterView 
                  user={user} 
                  reports={activeDashboardReports.filter(r => r.workGroup === user.workGroup)} 
                  handOverReports={handOverReports}
                  resolutionStatuses={resolutionStatuses}
                  operators={filteredOperators}
                  addOperator={addOperator}
                  updateOperator={updateOperator}
                  deleteOperator={deleteOperator}
                  addReport={addReport} 
                  updateReport={updateReport}
                  duplicateReport={duplicateReport}
                  deleteReport={deleteReport}
                  workGroups={workGroups}
                  onBulkUpload={onBulkUpload}
                  tickets={tickets}
                  hideNotifications={true}
                />;
      case Role.COORDINATOR:
      case Role.SCHEDULER:
      case Role.MECH_SUPERVISOR:
      case Role.ELEC_SUPERVISOR:
      case Role.TECH_SUPERVISOR:
      case Role.INST_SUPERVISOR:
      case Role.FOREMAN:
      case Role.OPS_FOREMAN: {
        const isOpsForeman = user.role === Role.OPS_FOREMAN;
        return <CoordinatorView 
                    user={user} 
                    reports={isOpsForeman ? reports.filter(r => r.workGroup === user.workGroup) : reports} 
                    handOverReports={isOpsForeman ? handOverReports.filter(r => r.workGroup === user.workGroup) : handOverReports}
                    artisans={filteredArtisans} 
                    resolutionStatuses={resolutionStatuses}
                    sections={sections}
                    users={users}
                    operators={filteredOperators}
                    addOperator={addOperator}
                    updateOperator={updateOperator}
                    deleteOperator={deleteOperator}
                    updateReport={updateReport} 
                    addReport={addReport} 
                    workGroups={workGroups} 
                    duplicateReport={duplicateReport}
                    loadMoreReports={loadMoreReports}
                    setCurrentView={setCurrentView}
                    updateUser={updateUser}
                    deleteUser={deleteUser}
                />;
      }
      case Role.GUEST:
        if (currentView === 'dashboard') {
            return <CoordinatorView 
                user={user} 
                reports={reports} 
                handOverReports={handOverReports}
                artisans={filteredArtisans} 
                resolutionStatuses={resolutionStatuses}
                sections={sections}
                users={users}
                operators={operators}
                addOperator={addOperator}
                updateOperator={updateOperator}
                deleteOperator={deleteOperator}
                updateReport={updateReport} 
                addReport={addReport} 
                workGroups={workGroups} 
                duplicateReport={duplicateReport}
                loadMoreReports={loadMoreReports}
                setCurrentView={setCurrentView}
            />;
        }
        return <SummaryView reports={activeDashboardReports} workGroups={workGroups} />;
      default:
        return null;
    }
  }

  const unreadCount = useMemo(() => {
    const sentRepliesUnread = adminMessages.filter(m => m.senderId === user.id && m.adminReply && !m.isReplyReadByUser).length;
    
    if (user.role === Role.ADMIN) {
      const incomingUnread = adminMessages.filter(m => m.recipientType === 'admin' && !m.isReadByAdmin).length;
      return sentRepliesUnread + incomingUnread;
    }
    
    const isScheduler = [Role.SCHEDULER, Role.MECH_SUPERVISOR, Role.ELEC_SUPERVISOR, Role.TECH_SUPERVISOR, Role.INST_SUPERVISOR].includes(user.role);
    if (isScheduler) {
      const incomingUnread = adminMessages.filter(m => m.recipientType === 'scheduler' && !m.isReadByAdmin).length;
      return sentRepliesUnread + incomingUnread;
    }
    
    return sentRepliesUnread;
  }, [adminMessages, user]);

  const isMaint = isMaintenanceForeman(user);
  const userDiscipline = getUserDiscipline(user);
  const relevantHandOverCount = useMemo(() => {
    // Maintenance Shift Foreman (Role.FOREMAN) can view all handovers
    if (user.role === Role.FOREMAN) {
      return handOverReports.length;
    }
    const isSupervisor = [Role.MECH_SUPERVISOR, Role.ELEC_SUPERVISOR, Role.TECH_SUPERVISOR, Role.INST_SUPERVISOR].includes(user.role);
    if (isSupervisor && userDiscipline) {
      return handOverReports.filter(r => matchesDisciplineHandover(r, userDiscipline, user)).length;
    }
    if (isMaint && userDiscipline) {
      return handOverReports.filter(r => matchesDisciplineHandover(r, userDiscipline, user)).length;
    }
    return handOverReports.filter(r => r.reporter?.shift === currentShift).length;
  }, [handOverReports, isMaint, userDiscipline, user, currentShift]);

  return (
    <div className="flex flex-col h-screen print:h-auto print:block">
      <Header 
        user={user} 
        onLogout={onLogout} 
        currentView={currentView} 
        setCurrentView={setCurrentView}
        currentShift={currentShift}
        onShiftChange={onShiftChange}
        handOverCount={relevantHandOverCount}
        unreadAdminMessages={unreadCount}
        updateUser={updateUser}
        onMessageAdmin={() => setIsMessageModalOpen(true)}
        onOpenQRModal={() => setIsQRModalOpen(true)}
        onSwitchRole={(role) => switchRole(user.id, role)}
        onLockTerminal={onLockTerminal}
      />
      <main className="flex-1 overflow-hidden flex flex-col print:p-0 print:overflow-visible print:block min-h-0 pb-7 print:pb-0">
        <div className="flex-1 flex flex-col p-3 lg:p-4 min-h-0 overflow-hidden print:overflow-visible print:block print:min-h-max print:h-auto">
          {/* Reporter Drafts & Lockout Banners */}
          {user.role === Role.REPORTER && pendingDrafts.length > 0 && (
            <div id="field-drafts-notifications" className="mb-3 bg-amber-950/40 border-2 border-amber-600/60 rounded-xl p-3 shadow-xl scroll-mt-4">
              <div className="flex items-center justify-between border-b border-amber-700/50 pb-2 mb-2.5">
                <div className="flex items-center gap-2">
                  <span className="p-1 bg-amber-500/20 text-amber-400 rounded-md">
                    <AlertTriangle className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                      Incoming Field Drafts Awaiting Your Verification ({pendingDrafts.length})
                    </h3>
                    <p className="text-[10px] text-amber-200/70">
                      Scanned and submitted from the field. Review the fault, make any necessary adjustments, and submit to active dispatch.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
                {pendingDrafts.map(draft => (
                  <div 
                    key={draft.id}
                    className="bg-gray-900/90 border border-amber-600/40 hover:border-amber-500 rounded-lg p-3 flex flex-col justify-between space-y-2 shadow-md"
                  >
                    <div>
                      <div className="flex justify-between items-start gap-1">
                        <span className="text-[10px] font-mono font-bold bg-amber-900/60 text-amber-200 border border-amber-700/60 px-1.5 py-0.5 rounded">
                          FG: {draft.equipmentNumber}
                        </span>
                        <span className="text-[9px] text-gray-400">
                          {new Date(draft.reportingTime).toLocaleTimeString()}
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-white mt-1">
                        {draft.equipment}
                      </h4>

                      <p className="text-[11px] text-gray-300 line-clamp-2 mt-0.5 bg-gray-950/60 p-1.5 rounded border border-gray-800">
                        {draft.reportedFault}
                      </p>

                      {draft.safetyConcern ? (
                        <div className="mt-1 text-[10px] font-bold text-red-400 flex items-center gap-1 bg-red-950/60 px-1.5 py-0.5 rounded border border-red-800/60">
                          <ShieldAlert className="w-3 h-3 text-red-400" />
                          Safety Concern Flagged
                        </div>
                      ) : null}

                      <div className="flex items-center justify-between text-[10px] text-gray-400 mt-1.5">
                        <span>By: <strong className="text-gray-200">{draft.reporter.name}</strong></span>
                        {draft.reporter.employeeNumber && <span>#{draft.reporter.employeeNumber}</span>}
                      </div>

                      {/* Attachments preview */}
                      {(draft.defectImages?.length || draft.audioNote) && (
                        <div className="flex items-center gap-1.5 mt-1.5 pt-1 border-t border-gray-800">
                          {draft.defectImages && draft.defectImages.length > 0 && (
                            <div className="flex gap-1">
                              {draft.defectImages.map((img, i) => (
                                <button
                                  key={i}
                                  type="button"
                                  onClick={() => setSelectedImagePreview(img)}
                                  className="w-6 h-6 rounded bg-gray-800 border border-gray-700 overflow-hidden hover:opacity-80 transition cursor-pointer"
                                  title="Preview photo"
                                >
                                  <img src={img} alt="Defect" className="w-full h-full object-cover" />
                                </button>
                              ))}
                            </div>
                          )}

                          {draft.audioNote && (
                            <button
                              type="button"
                              onClick={() => {
                                if (playingAudioId === draft.id) {
                                  setPlayingAudioId(null);
                                } else {
                                  setPlayingAudioId(draft.id);
                                  const audio = new Audio(draft.audioNote);
                                  audio.play();
                                  audio.onended = () => setPlayingAudioId(null);
                                }
                              }}
                              className="px-1.5 py-0.5 bg-blue-900/40 text-blue-300 border border-blue-700/60 rounded text-[9px] font-bold flex items-center gap-1 hover:bg-blue-800/60 cursor-pointer"
                            >
                              <Volume2 className="w-2.5 h-2.5" />
                              {playingAudioId === draft.id ? 'Playing...' : 'Voice Note'}
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Draft Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-800 gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleRejectDraft(draft.id)}
                        className="p-1.5 text-red-400 hover:text-white bg-red-950/40 hover:bg-red-900/60 border border-red-800/50 rounded text-[10px] font-bold transition cursor-pointer"
                        title="Reject / Discard Draft"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setReportToEdit(draft);
                          setIsEditModalOpen(true);
                        }}
                        className="flex-1 py-1 px-2 text-indigo-300 hover:text-white bg-indigo-950/40 hover:bg-indigo-900/60 border border-indigo-800/50 rounded text-[10px] font-bold flex items-center justify-center gap-1 transition cursor-pointer"
                      >
                        <Edit3 className="w-3 h-3" />
                        Review & Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => handleApproveDraft(draft.id)}
                        className="py-1 px-2.5 text-white bg-emerald-600 hover:bg-emerald-500 rounded text-[10px] font-extrabold flex items-center gap-1 shadow-md transition cursor-pointer active:scale-95"
                      >
                        <CheckCircle2 className="w-3 h-3 stroke-[2.5]" />
                        Submit to Active
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {user.role === Role.REPORTER && pendingLockouts.length > 0 && (
            <div id="lockout-notifications" className="mb-3 bg-amber-950/40 border-2 border-amber-600/60 rounded-xl p-3 shadow-xl scroll-mt-4">
              <div className="flex items-center justify-between border-b border-amber-700/50 pb-2 mb-2.5">
                <div className="flex items-center gap-2">
                  <span className="p-1 bg-amber-500/20 text-amber-400 rounded-md">
                    <Lock className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                      Incoming Lockout & Isolation Requests Awaiting Approval ({pendingLockouts.length})
                    </h3>
                    <p className="text-[10px] text-amber-200/70">
                      Requested from the field. Review the scope and approve or reject the safety lockout.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
                {pendingLockouts.map(ticket => (
                  <div 
                    key={ticket.id}
                    onClick={() => openJobCard(ticket.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openJobCard(ticket.id); }}
                    className="cursor-pointer bg-gray-900/90 border border-amber-600/40 hover:border-amber-500 hover:bg-gray-800 rounded-lg p-3 flex flex-col justify-between space-y-2 shadow-md transition"
                  >
                    <div>
                      <div className="flex justify-between items-start gap-1">
                        <span className="text-[10px] font-mono font-bold bg-amber-900/60 text-amber-200 border border-amber-700/60 px-1.5 py-0.5 rounded">
                          ID: {ticket.equipmentNumber}
                        </span>
                        <span className="text-[9px] text-gray-400">
                          {new Date(ticket.lockoutTime).toLocaleTimeString()}
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-white mt-1">
                        {ticket.equipment}
                      </h4>

                      <p className="text-[11px] text-gray-300 line-clamp-2 mt-0.5 bg-gray-950/60 p-1.5 rounded border border-gray-800">
                        {ticket.lockoutComments}
                      </p>

                      <div className="flex items-center justify-between text-[10px] text-gray-400 mt-1.5">
                        <span>By: <strong className="text-gray-200">{ticket.requestedByUserName}</strong></span>
                        {ticket.bookedDurationMinutes && <span>Duration: {ticket.bookedDurationMinutes}m</span>}
                      </div>
                    </div>

                    {/* Lockout Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-800 gap-1.5">
                      <button
                        type="button"
                        onClick={() => openJobCard(ticket.id)}
                        className="px-2 py-1 text-amber-200 hover:text-white bg-amber-950/40 hover:bg-amber-900/60 border border-amber-800/50 rounded text-[10px] font-bold transition cursor-pointer"
                        title="Open Job Card"
                      >
                        Open
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRejectLockout(ticket.id)}
                        className="p-1.5 text-red-400 hover:text-white bg-red-950/40 hover:bg-red-900/60 border border-red-800/50 rounded text-[10px] font-bold transition cursor-pointer"
                        title="Reject Lockout"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleApproveLockout(ticket.id)}
                        className="flex-1 py-1 px-2.5 text-white bg-emerald-600 hover:bg-emerald-500 rounded text-[10px] font-extrabold flex items-center justify-center gap-1 shadow-md transition cursor-pointer active:scale-95"
                      >
                        <CheckCircle2 className="w-3 h-3 stroke-[2.5]" />
                        Approve & Activate Lockout
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {areaJobCards.length > 0 && (
            <div id="job-cards-notifications" className="mb-3 bg-amber-950/40 border-2 border-amber-600/60 rounded-xl p-3 shadow-xl scroll-mt-4">
              <div className="flex items-center justify-between border-b border-amber-700/50 pb-2 mb-2.5">
                <div className="flex items-center gap-2">
                  <span className="p-1 bg-amber-500/20 text-amber-400 rounded-md">
                    <Lock className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                      Field Job Cards & Safety Isolations ({areaJobCards.length})
                    </h3>
                    <p className="text-[10px] text-amber-200/70">
                      Acknowledge a job card to clear it from your dashboard. Open it to manage the isolation.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-amber-200/60 font-mono">Area: {user.workGroup || 'All'}</span>
                  <button
                    type="button"
                    onClick={acknowledgeAllJobCardNotifications}
                    className="text-[10px] font-extrabold uppercase bg-amber-600 hover:bg-amber-500 text-black px-2 py-1 rounded transition"
                  >
                    Acknowledge All
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
                {areaJobCards.map(t => {
                  const st = t.status || t.state;
                  return (
                    <div
                      key={t.id}
                      onClick={() => openJobCard(t.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openJobCard(t.id); }}
                      className="cursor-pointer bg-gray-900/90 border border-amber-600/40 hover:border-amber-500 hover:bg-gray-800 rounded-lg p-3 flex flex-col justify-between space-y-2 shadow-md transition"
                    >
                      <div>
                        <div className="flex justify-between items-start gap-1">
                          <span className="text-[10px] font-mono font-bold bg-amber-900/60 text-amber-200 border border-amber-700/60 px-1.5 py-0.5 rounded">
                            ID: {t.equipmentNumber}
                          </span>
                          <div className="flex items-center gap-1">
                            <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded border ${
                              st === 'LOCKOUT_ACTIVE'
                                ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                                : 'bg-amber-950 text-amber-300 border-amber-800'
                            }`}>
                              {st.replace(/_/g, ' ')}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); acknowledgeJobCardNotification(t.id); }}
                              title="Acknowledge and remove from dashboard"
                              className="text-emerald-400 hover:text-emerald-300 p-0.5"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <h4 className="text-xs font-bold text-white mt-1">{t.equipment}</h4>

                        <p className="text-[11px] text-gray-300 line-clamp-2 mt-0.5 bg-gray-950/60 p-1.5 rounded border border-gray-800">
                          {t.lockoutComments}
                        </p>

                        <div className="flex items-center justify-between text-[10px] text-gray-400 mt-1.5">
                          <span>By: <strong className="text-gray-200">{t.requestedByUserName}</strong></span>
                          <span className="font-mono">
                            {new Date(t.lockoutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 pt-1 border-t border-amber-700/30">
                        <button
                          onClick={(e) => { e.stopPropagation(); openJobCard(t.id); }}
                          className="flex-1 bg-amber-600 hover:bg-amber-500 text-black text-[10px] font-extrabold uppercase px-2 py-1 rounded transition"
                        >
                          Open Job Card
                        </button>
                        {(st === 'LOCKOUT_REQUESTED' || st === 'EQUIPMENT_CONFIRMED' || st === 'SCADA_STOP_CONFIRMED') && (
                          <>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleApproveLockout(t.id); }}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-extrabold uppercase px-2 py-1 rounded transition"
                            >
                              Approve
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleRejectLockout(t.id); }}
                              className="bg-gray-700 hover:bg-gray-600 text-gray-200 text-[10px] font-extrabold uppercase px-2 py-1 rounded transition"
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {renderMainView()}
        </div>
      </main>

      {isMessageModalOpen && (
        <MessageAdminModal 
            user={user}
            userMessages={adminMessages.filter(m => m.senderId === user.id)}
            allMessages={adminMessages}
            users={users}
            workGroups={workGroups}
            onClose={() => setIsMessageModalOpen(false)}
            onSubmit={addAdminMessage}
            updateAdminMessage={updateAdminMessage}
        />
      )}

      {activeAlert && (
        <div id="acknowledgement-popup" className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[200] p-4 text-left">
          <div className="bg-gray-800 border-2 border-red-500/50 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-red-950/40 border-b border-gray-700 p-4 flex items-center gap-3">
              <div className="bg-red-500/20 p-2 rounded-full text-red-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase bg-red-900/40 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full tracking-widest">
                  Acknowledge Required
                </span>
                <h3 className="text-lg font-bold text-white mt-1">Broadcast Notification</h3>
              </div>
            </div>
            
            <div className="p-6">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-1.5 text-xs text-gray-400 font-bold">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Sender: <span className="text-gray-200 font-semibold">{activeAlert.senderName}</span>
                </div>
                <div className="text-xs text-gray-500 font-medium">
                  {new Date(activeAlert.timestamp).toLocaleString()}
                </div>
              </div>
              
              <div className="bg-gray-900/60 border border-gray-700/50 p-4 rounded-lg text-sm text-gray-100 font-medium leading-relaxed mb-6 whitespace-pre-wrap">
                {activeAlert.content}
              </div>

              <div className="flex flex-col items-center gap-2">
                <button
                  id="btn-acknowledge"
                  disabled={acknowledgingId === activeAlert.id}
                  onClick={async () => {
                    const alertId = activeAlert.id;
                    // Instantly update local state so the popup goes away right away
                    trackLocalAck(alertId);

                    if (acknowledgeMessage) {
                      setAcknowledgingId(alertId);
                      try {
                        await acknowledgeMessage(alertId, user.id);
                      } catch (e) {
                        console.error(e);
                      } finally {
                        setAcknowledgingId(null);
                      }
                    }
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-bold py-3.5 px-4 rounded-lg text-sm transition duration-200 shadow-lg shadow-blue-600/15 uppercase tracking-wider flex items-center justify-center gap-2"
                >
                  {acknowledgingId === activeAlert.id ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Acknowledging...
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      I Acknowledge and Clear
                    </>
                  )}
                </button>
                {unacknowledgedMessages.length > 1 && (
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                    {unacknowledgedMessages.length - 1} more unacknowledged message(s) pending
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    
      <CommentsModal
        isOpen={isCommentsModalOpen}
        onClose={() => {setIsCommentsModalOpen(false); setCommentsReport(null);}}
        report={commentsReport}
        currentUser={user}
        onUpdateReport={updateReport}
      />

      <EquipmentOverviewModal
        isOpen={isEquipmentOverviewOpen}
        onClose={() => {setIsEquipmentOverviewOpen(false); setOverviewReport(null);}}
        report={overviewReport}
        currentUser={user}
        onOpenComments={handleOpenComments}
      />

      <EquipmentQRModal
        isOpen={isQRModalOpen}
        onClose={() => setIsQRModalOpen(false)}
        currentUser={user}
        initialArea={user?.workGroup}
      />

      <EditReportModal
        isOpen={isEditModalOpen}
        onClose={() => { setIsEditModalOpen(false); setReportToEdit(null); }}
        report={reportToEdit}
        onSubmit={updateReport}
        currentUser={user}
        artisans={[]}
        resolutionStatuses={resolutionStatuses}
      />

      {selectedImagePreview && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
          onClick={() => setSelectedImagePreview(null)}
        >
          <div className="max-w-2xl max-h-[85vh] bg-gray-900 border border-gray-700 rounded-2xl p-2 relative shadow-2xl">
            <img
              src={selectedImagePreview}
              alt="Defect Preview"
              className="max-h-[80vh] w-auto object-contain rounded-xl"
            />
            <button
              onClick={() => setSelectedImagePreview(null)}
              className="absolute top-4 right-4 bg-gray-900/80 text-white rounded-full p-2 hover:bg-gray-800"
            >
              ✕
            </button>
          </div>
        </div>
      )}
</div>
  );
};

export default Dashboard;
