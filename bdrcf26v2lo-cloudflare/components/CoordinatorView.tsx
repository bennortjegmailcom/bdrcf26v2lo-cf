
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import CommentsModal from './modals/CommentsModal';
import { BreakdownReport, Status, User, Artisan, Assignment, Role, WorkGroup, ResolutionStatusItem, Operator, ResolutionStatus, Shift, HandoverSection, AppView, SCHEDULER_APPROVABLE_ROLES } from '../types';
import BreakdownTable from './BreakdownTable';
import AssignJobModal from './modals/AssignJobModal';
import ResolveJobModal from './modals/ResolveJobModal';
import CompleteJobModal from './modals/CompleteJobModal';
import EditReportModal from './modals/EditReportModal';
import CreateReportModal from './modals/CreateReportModal';
import UserManagementTable from './UserManagementTable';
import EditUserModal from './modals/EditUserModal';
import ResetPasswordModal from './modals/ResetPasswordModal';
import { 
  getProductionDayStart, 
  getProductionDayEnd, 
  isMaintenanceForeman, 
  getUserDiscipline, 
  matchesDisciplineHandover, 
  matchesDiscipline, 
  isHandoverReport,
  TimePeriod,
  TIME_PERIODS,
  TIME_PERIOD_HOURS,
  TIME_PERIOD_DAYS
} from '../utils';

interface CoordinatorViewProps {
  reports: BreakdownReport[];
  handOverReports: BreakdownReport[];
  artisans: Artisan[];
  updateReport: (reportId: string, updates: Partial<BreakdownReport>) => void;
  user: User;
  addReport: (reportData: Omit<BreakdownReport, 'id' | 'reportingTime' | 'reporter' | 'status'>, employeeNumber?: string) => void;
  workGroups: WorkGroup[];
  resolutionStatuses: ResolutionStatusItem[];
  operators: Operator[];
  addOperator: (name: string, shift: Shift, workGroup?: string, employeeNumber?: string) => void;
  updateOperator: (id: string, updates: Partial<Operator>) => void;
  deleteOperator: (id: string) => void;
  duplicateReport?: (reportId: string) => void;
  loadMoreReports?: () => void;
  sections?: HandoverSection[];
  users?: User[];
  setCurrentView: (view: AppView) => void;
  updateUser?: (userId: string, updates: Partial<User>) => void;
  deleteUser?: (userId: string) => void;
}

const CoordinatorView: React.FC<CoordinatorViewProps> = ({ 
  reports, 
  handOverReports, 
  artisans, 
  updateReport, 
  user, 
  addReport, 
  workGroups, 
  resolutionStatuses, 
  operators, 
  addOperator, 
  updateOperator, 
  deleteOperator, 
  duplicateReport, 
  loadMoreReports, 
  sections = [], 
  users = [], 
  setCurrentView,
  updateUser,
  deleteUser
}) => {
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCommentsModalOpen, setIsCommentsModalOpen] = useState(false);
  const [isManageUsersOpen, setIsManageUsersOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [userToResetPassword, setUserToResetPassword] = useState<User | null>(null);
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const isScheduler = user.role === Role.SCHEDULER;

  const pendingAccessRequests = useMemo(
    () => users.filter(u => u.isApproved === false && SCHEDULER_APPROVABLE_ROLES.includes(u.role)),
    [users]
  );

  const handleApproveAccessRequest = (requestUser: User) => {
    if (updateUser) updateUser(requestUser.id, { isApproved: true });
  };

  const handleDenyAccessRequest = (requestUser: User) => {
    if (window.confirm(`Deny the access request from ${requestUser.name}?`)) {
      if (deleteUser) deleteUser(requestUser.id);
    }
  };

  const handleOpenResetPassword = (targetUser: User) => {
    setUserToResetPassword(targetUser);
    setIsResetPasswordOpen(true);
  };
  const [selectedReport, setSelectedReport] = useState<BreakdownReport | null>(null);
  const [commentsReport, setCommentsReport] = useState<BreakdownReport | null>(null);
  const handleOpenComments = (report: BreakdownReport) => {
    setCommentsReport(report);
    setIsCommentsModalOpen(true);
  };

  const userDiscipline = getUserDiscipline(user);
  const isDisciplineSupervisor = [
    Role.MECH_SUPERVISOR,
    Role.ELEC_SUPERVISOR,
    Role.TECH_SUPERVISOR,
    Role.INST_SUPERVISOR
  ].includes(user.role);
  
  // Work Group Filter State: default to user's assigned area if present, or all areas (empty array) for supervisor
  const [selectedGroups, setSelectedGroups] = useState<string[]>(() => {
    if (user.workGroup) return [user.workGroup];
    if (isDisciplineSupervisor && workGroups.length > 0) return [];
    return [];
  });

  const prevUserRef = useRef({ id: user.id, role: user.role });
  useEffect(() => {
    if (prevUserRef.current.id !== user.id || prevUserRef.current.role !== user.role) {
      prevUserRef.current = { id: user.id, role: user.role };
      if (user.workGroup) {
        setSelectedGroups([user.workGroup]);
      } else if (isDisciplineSupervisor && workGroups.length > 0) {
        setSelectedGroups([]);
      } else {
        setSelectedGroups([]);
      }
    }
  }, [user.id, user.role, user.workGroup, isDisciplineSupervisor, workGroups]);

  // Supervisor View Mode: 'handedOver' (Default) | 'allDiscipline' | 'allArea' | 'completed'
  const [supervisorViewMode, setSupervisorViewMode] = useState<'handedOver' | 'allDiscipline' | 'allArea' | 'completed'>('handedOver');
  
  // Filter expansion state
  const [isFilterExpanded, setIsFilterExpanded] = useState(true);
  
  // Artisan Filter State
  const [selectedArtisan, setSelectedArtisan] = useState<{ id: string, name: string } | null>(null);

  // Discipline Filter State
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>('');

  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && loadMoreReports) {
          loadMoreReports();
        }
      },
      { threshold: 0.1 }
    );

    const target = observerTarget.current;
    if (target) {
      observer.observe(target);
    }

    return () => {
      if (target) {
        observer.unobserve(target);
      }
    };
  }, [loadMoreReports]);

  // Time Period Filter State
  const [timePeriod, setTimePeriod] = useState<TimePeriod>(user.role === Role.SCHEDULER ? '12 hours' : '1 day');

  // Reports belonging to currently selected groups (or all if none selected)
  const areaFilteredReports = useMemo(() => {
    return reports.filter(r => selectedGroups.length === 0 || selectedGroups.includes(r.workGroup));
  }, [reports, selectedGroups]);

  // Specific counts for supervisor dashboard tabs
  const handedOverCount = useMemo(() => {
    if (!userDiscipline) return 0;
    return areaFilteredReports.filter(r => 
      isHandoverReport(r) && matchesDisciplineHandover(r, userDiscipline, user)
    ).length;
  }, [areaFilteredReports, userDiscipline, user]);

  const allDisciplineCount = useMemo(() => {
    if (!userDiscipline) return 0;
    return areaFilteredReports.filter(r => 
      r.status !== Status.COMPLETED && matchesDiscipline(r, userDiscipline, user)
    ).length;
  }, [areaFilteredReports, userDiscipline, user]);

  const allAreaCount = useMemo(() => {
    return areaFilteredReports.filter(r => r.status !== Status.COMPLETED).length;
  }, [areaFilteredReports]);

  const completedCount = useMemo(() => {
    if (!userDiscipline) return 0;
    return areaFilteredReports.filter(r => 
      r.status === Status.COMPLETED && matchesDisciplineHandover(r, userDiscipline, user)
    ).length;
  }, [areaFilteredReports, userDiscipline, user]);

  const activeDashboardReports = useMemo(() => {
    const productionDayStart = getProductionDayStart(new Date());
    
    // Determine the start date based on the selected time period
    let filterStartDate = new Date(productionDayStart);
    const hoursBack = TIME_PERIOD_HOURS[timePeriod];
    const daysBack = TIME_PERIOD_DAYS[timePeriod];
    if (hoursBack !== undefined) {
        filterStartDate = new Date(new Date().getTime() - (hoursBack * 60 * 60 * 1000));
    } else if (daysBack !== undefined) {
        filterStartDate.setDate(filterStartDate.getDate() - daysBack);
    } else if (timePeriod === 'All') {
        filterStartDate = new Date(0);
    }
    
    const productionDayEnd = getProductionDayEnd(productionDayStart);
    
    return reports.filter(r => {
        // Filter by selected work groups if any are selected
        const matchesGroup = selectedGroups.length === 0 || selectedGroups.includes(r.workGroup);
        if (!matchesGroup) return false;
        
        // Filter by selected artisan if set
        const matchesArtisan = !selectedArtisan || 
            (r.assignments && r.assignments.some(a => a.artisanId === selectedArtisan.id));
        if (!matchesArtisan) return false;

        // Filter by selected discipline if set
        if (selectedDiscipline && !matchesDiscipline(r, selectedDiscipline, user)) {
            return false;
        }

        // Discipline Supervisor Mode filtering
        if (isDisciplineSupervisor && userDiscipline) {
          if (supervisorViewMode === 'handedOver') {
            // Must match discipline handover criteria
            const isHanded = isHandoverReport(r) && matchesDisciplineHandover(r, userDiscipline, user);
            if (!isHanded) return false;

            // Uncompleted equipment handed to discipline is ALWAYS shown regardless of reporting date
            if (r.status !== Status.COMPLETED) return true;
            if (timePeriod === 'All') return true;
            const reportingTime = new Date(r.reportingTime);
            return reportingTime >= filterStartDate && reportingTime < productionDayEnd;
          }

          if (supervisorViewMode === 'allDiscipline') {
            const isDisc = matchesDiscipline(r, userDiscipline, user);
            if (!isDisc) return false;
            if (r.status !== Status.COMPLETED) return true;
            if (timePeriod === 'All') return true;
            const reportingTime = new Date(r.reportingTime);
            return reportingTime >= filterStartDate && reportingTime < productionDayEnd;
          }

          if (supervisorViewMode === 'completed') {
            if (r.status !== Status.COMPLETED) return false;
            const isHanded = matchesDisciplineHandover(r, userDiscipline, user);
            if (!isHanded) return false;
            if (timePeriod === 'All') return true;
            const actionTime = new Date(r.completedTime || r.resolutionTime || r.reportingTime);
            return actionTime >= filterStartDate && actionTime < productionDayEnd;
          }

          // 'allArea' falls through to standard time filter below
        }
        
        // Keep uncompleted equipment and unacknowledged handovers visible regardless of reporting date
        if (r.status !== Status.COMPLETED) return true;
        if ((r.resolutionStatus === 'Hand Over' || r.resolutionStatus === 'Given to dayshift' || r.isNextShift) && !r.dayshiftAcknowledged) {
          return true;
        }

        if (timePeriod === 'All') return true;
        const reportingTime = new Date(r.reportingTime);
        return reportingTime >= filterStartDate && reportingTime < productionDayEnd;
    });
  }, [reports, selectedGroups, selectedArtisan, selectedDiscipline, timePeriod, isDisciplineSupervisor, userDiscipline, user, supervisorViewMode]);

  const toggleGroup = (groupName: string) => {
    setSelectedGroups(prev => 
      prev.includes(groupName) 
        ? prev.filter(g => g !== groupName) 
        : [...prev, groupName]
    );
  };

  const clearFilters = () => {
    setSelectedGroups(user.workGroup ? [user.workGroup] : (isDisciplineSupervisor && workGroups.length > 0 ? [] : []));
    setSelectedArtisan(null);
    setSelectedDiscipline('');
    setTimePeriod(user.role === Role.SCHEDULER ? '12 hours' : '1 day');
    if (isDisciplineSupervisor) {
      setSupervisorViewMode('handedOver');
    }
  };

  const openAssignModal = (report: BreakdownReport) => {
    setSelectedReport(report);
    setIsAssignModalOpen(true);
  };
  
  const openResolveModal = (report: BreakdownReport) => {
    setSelectedReport(report);
    setIsResolveModalOpen(true);
  };

  const openCompleteModal = (report: BreakdownReport) => {
    setSelectedReport(report);
    setIsCompleteModalOpen(true);
  };

  const openEditModal = (report: BreakdownReport) => {
      setSelectedReport(report);
      setIsEditModalOpen(true);
  }

  const handleAssign = (data: { notificationNumber: string; assignments: Assignment[] }) => {
    if(selectedReport) {
      updateReport(selectedReport.id, { 
        notificationNumber: data.notificationNumber,
        assignments: data.assignments,
        status: Status.ASSIGNED, 
        assignedTime: new Date().toISOString() 
      });
    }
    setIsAssignModalOpen(false);
    setSelectedReport(null);
  }

  const handleResolve = (data: {
    whatWasWrong: string;
    resolutionStatus: ResolutionStatus;
    resolutionTime: string;
    resolutionNotes?: string;
    resolutionEmployeeNumber?: string;
    handoverSection?: string;
    handoverRecipientId?: string;
    handoverRecipientName?: string;
    handbackNotes?: string;
    handoverSafetyVerified?: boolean;
    dayshiftAcknowledged?: boolean;
  }) => {
     if(selectedReport) {
      updateReport(selectedReport.id, { ...data, status: Status.RESOLVED });
    }
    setIsResolveModalOpen(false);
    setSelectedReport(null);
  }

  const handleComplete = (completedTime: string) => {
    if (selectedReport) {
        updateReport(selectedReport.id, {
            status: Status.COMPLETED,
            completedTime: completedTime
        });
    }
    setIsCompleteModalOpen(false);
    setSelectedReport(null);
  };

  const handleFilterArtisan = (id: string, name: string) => {
    setSelectedArtisan({ id, name });
  };

  if (isManageUsersOpen) {
    return (
      <div className="flex flex-col h-full w-full bg-gray-900 rounded-xl overflow-hidden">
        <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-5 border-b border-gray-700 bg-gray-800/60">
          <div className="min-w-0">
            <h2 className="text-base sm:text-2xl font-black tracking-tight text-white">
              User Management, Join Requests & Password Resets
            </h2>
            <p className="text-[11px] sm:text-xs text-gray-400 mt-0.5">
              {isScheduler
                ? 'Approve access requests for Admin, Scheduler and Supervisor roles, and reset user passwords.'
                : 'Review registered users, approve join requests/roles, and assist users with password resets.'}
            </p>
          </div>
          <button
            onClick={() => setIsManageUsersOpen(false)}
            className="shrink-0 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-3 rounded-md text-xs sm:text-sm transition"
          >
            &larr; Back to Dashboard
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-6 space-y-4 custom-scrollbar">
          {isScheduler && (
            <div className="bg-gray-900/60 border border-amber-700/50 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider text-amber-300">
                  Pending Access Requests ({pendingAccessRequests.length})
                </h4>
              </div>
              <p className="text-[10px] text-gray-400">
                You may approve requests for Admin, Scheduler, Mechanical, Electrical, Technical or Instrumentation Supervisor.
              </p>
              {pendingAccessRequests.length === 0 ? (
                <p className="text-xs text-gray-500 italic">No pending requests for your approval.</p>
              ) : (
                <div className="space-y-2">
                  {pendingAccessRequests.map(requestUser => (
                    <div key={requestUser.id} className="bg-gray-800 border border-gray-700 rounded-lg p-2.5 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white truncate">{requestUser.name}</p>
                        <p className="text-[11px] text-amber-300 font-semibold">{requestUser.role}</p>
                        <p className="text-[10px] text-gray-400">
                          {requestUser.workGroup || 'No area'}
                          {requestUser.employeeNumber ? ` · Emp# ${requestUser.employeeNumber}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleApproveAccessRequest(requestUser)}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-extrabold uppercase px-2 py-1 rounded transition"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleDenyAccessRequest(requestUser)}
                          className="bg-gray-700 hover:bg-gray-600 text-gray-300 text-[10px] font-extrabold uppercase px-2 py-1 rounded transition"
                        >
                          Deny
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <UserManagementTable
            users={users}
            currentUser={user}
            restricted={isScheduler}
            onResetPassword={handleOpenResetPassword}
            onEdit={(u) => {
              setUserToEdit(u);
              setIsEditUserOpen(true);
            }}
            onDelete={(userId) => {
              if (window.confirm('Are you sure you want to delete this user?')) {
                if (deleteUser) deleteUser(userId);
              }
            }}
          />
        </div>

        {!isScheduler && (
          <EditUserModal
            isOpen={isEditUserOpen}
            onClose={() => {
              setIsEditUserOpen(false);
              setUserToEdit(null);
            }}
            user={userToEdit}
            onSubmit={(userId, updates) => {
              if (updateUser) updateUser(userId, updates);
            }}
            workGroups={workGroups}
          />
        )}

        <ResetPasswordModal
          isOpen={isResetPasswordOpen}
          onClose={() => {
            setIsResetPasswordOpen(false);
            setUserToResetPassword(null);
          }}
          user={userToResetPassword}
          onSubmit={(userId, password) => {
            if (updateUser) updateUser(userId, { password });
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-3 space-y-2 md:space-y-0">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white">
              {isDisciplineSupervisor ? `${user.role} Dashboard` : 'Maintenance Dashboard'}
            </h2>
            {isDisciplineSupervisor && userDiscipline && (
              <span className="bg-purple-900/60 text-purple-300 border border-purple-500/50 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                <span>{userDiscipline === 'Electrical' ? '⚡' : userDiscipline === 'Mechanical' ? '⚙️' : '🔬'}</span>
                <span>{userDiscipline} Handover</span>
              </span>
            )}
          </div>
          <p className="text-[10px] text-gray-400">
            {isDisciplineSupervisor && userDiscipline
              ? `Showing equipment handed to ${userDiscipline} for ${selectedGroups.length > 0 ? selectedGroups.join(', ') : 'all areas'}.`
              : 'Manage and assign jobs.'}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {(user.role === Role.SCHEDULER || user.role === Role.FOREMAN || user.role === Role.OPS_FOREMAN || isDisciplineSupervisor) && (
              <>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-3 text-xs rounded-md transition duration-300 flex items-center shadow-lg"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                    New Report
                </button>
                <button
                    onClick={() => setCurrentView('tickets')}
                    className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-1.5 px-3 text-xs rounded-md transition duration-300 flex items-center shadow-lg"
                >
                    Edit Breakdown & Bookings
                </button>
                {(user.role === Role.SCHEDULER || user.role === Role.ADMIN) && (
                  <button
                    onClick={() => setIsManageUsersOpen(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1.5 px-3 text-xs rounded-md transition duration-300 flex items-center shadow-lg"
                  >
                    Manage Users & Approvals
                  </button>
                )}
              </>
          )}
        </div>
      </div>

      {/* Supervisor Discipline Mode Tabs */}
      {isDisciplineSupervisor && userDiscipline && (
        <div className="flex flex-wrap items-center gap-1.5 mb-2.5 bg-gray-800/80 p-1.5 rounded-lg border border-purple-800/40 shadow-sm">
          <button
            onClick={() => setSupervisorViewMode('handedOver')}
            className={`px-3 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 ${
              supervisorViewMode === 'handedOver'
                ? 'bg-purple-600 text-white shadow-md ring-1 ring-purple-400'
                : 'bg-gray-900/60 text-gray-300 hover:text-white hover:bg-gray-700'
            }`}
          >
            <span>{userDiscipline === 'Electrical' ? '⚡' : '⚙️'} Handed Over to {userDiscipline}</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${supervisorViewMode === 'handedOver' ? 'bg-purple-900 text-purple-100' : 'bg-gray-800 text-purple-300'}`}>
              {handedOverCount}
            </span>
          </button>
          <button
            onClick={() => setSupervisorViewMode('allDiscipline')}
            className={`px-3 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 ${
              supervisorViewMode === 'allDiscipline'
                ? 'bg-blue-600 text-white shadow-md ring-1 ring-blue-400'
                : 'bg-gray-900/60 text-gray-300 hover:text-white hover:bg-gray-700'
            }`}
          >
            <span>All {userDiscipline} Jobs</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${supervisorViewMode === 'allDiscipline' ? 'bg-blue-900 text-blue-100' : 'bg-gray-800 text-blue-300'}`}>
              {allDisciplineCount}
            </span>
          </button>
          <button
            onClick={() => setSupervisorViewMode('allArea')}
            className={`px-3 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 ${
              supervisorViewMode === 'allArea'
                ? 'bg-gray-700 text-white shadow-md ring-1 ring-gray-500'
                : 'bg-gray-900/60 text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            <span>All Area Breakdowns</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${supervisorViewMode === 'allArea' ? 'bg-gray-800 text-white' : 'bg-gray-800 text-gray-400'}`}>
              {allAreaCount}
            </span>
          </button>
          <button
            onClick={() => setSupervisorViewMode('completed')}
            className={`px-3 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 ${
              supervisorViewMode === 'completed'
                ? 'bg-green-700 text-white shadow-md ring-1 ring-green-400'
                : 'bg-gray-900/60 text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            <span>Completed Handover</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${supervisorViewMode === 'completed' ? 'bg-green-900 text-green-100' : 'bg-gray-800 text-green-300'}`}>
              {completedCount}
            </span>
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="mb-3 bg-gray-800/50 p-2 rounded-lg border border-gray-700">
        <button 
          onClick={() => setIsFilterExpanded(!isFilterExpanded)}
          className="flex items-center justify-between w-full text-[10px] font-bold text-gray-300 uppercase tracking-wider mb-2 hover:text-white"
        >
          <span>Filters {isFilterExpanded ? '▼' : '▶'}</span>
        </button>
        {isFilterExpanded && (
          <div className="space-y-2">
            {/* Area Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mr-1">Areas:</span>
              <button 
                onClick={() => { setSelectedGroups([]); }}
                className={`px-2 py-0.5 text-[10px] font-bold rounded-full border transition-all duration-200 ${selectedGroups.length === 0 ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'}`}
              >
                All
              </button>
              {workGroups.map((wg, i) => (
                <button 
                  key={`${wg.id}-${i}`}
                  onClick={() => toggleGroup(wg.name)}
                  className={`px-2 py-0.5 text-[10px] font-bold rounded-full border transition-all duration-200 ${selectedGroups.includes(wg.name) ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'}`}
                >
                  {wg.name}
                </button>
              ))}
            </div>

            {/* Discipline Filters */}
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-gray-700/50">
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mr-1">Disciplines:</span>
              <button 
                onClick={() => setSelectedDiscipline('')}
                className={`px-2 py-0.5 text-[10px] font-bold rounded-full border transition-all duration-200 ${!selectedDiscipline ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'}`}
              >
                All
              </button>
              {['Mechanical', 'Electrical', 'Technicians', 'Instrumentation', 'Operations', 'Services'].map((disc) => (
                <button 
                  key={disc}
                  onClick={() => setSelectedDiscipline(disc)}
                  className={`px-2 py-0.5 text-[10px] font-bold rounded-full border transition-all duration-200 ${selectedDiscipline === disc ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'}`}
                >
                  {disc}
                </button>
              ))}
            </div>

            {/* Time & Specific Filters */}
            <div className="flex flex-wrap items-center gap-4 pt-1 border-t border-gray-700/50">
               <div className="flex items-center space-x-1">
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mr-1">Time:</span>
                  <div className="flex flex-wrap gap-0.5 bg-gray-900/50 rounded-lg p-0.5 border border-gray-700">
                      {TIME_PERIODS.map((p) => (
                          <button
                              key={p}
                              onClick={() => setTimePeriod(p)}
                              className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all ${timePeriod === p ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                          >
                              {p}
                          </button>
                      ))}
                  </div>
               </div>

               {selectedArtisan && (
                <div className="flex items-center bg-blue-900/40 border border-blue-500 text-blue-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                  Artisan: {selectedArtisan.name}
                  <button onClick={() => setSelectedArtisan(null)} className="ml-1.5 hover:text-white transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              )}

              {(selectedGroups.length > 0 || selectedArtisan || selectedDiscipline || timePeriod !== (user.role === Role.SCHEDULER ? '12 hours' : '1 day') || (isDisciplineSupervisor && supervisorViewMode !== 'handedOver')) && (
                <button onClick={clearFilters} className="text-[10px] text-red-400 hover:text-red-300 underline font-medium">Reset Filters</button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar rounded-lg shadow-inner flex flex-col pr-2 pb-2">
          <BreakdownTable onOpenComments={handleOpenComments} reports={activeDashboardReports}
            user={user}
            onAssign={openAssignModal}
            onResolve={openResolveModal}
            onComplete={openCompleteModal}
            onEdit={openEditModal}
            onUpdateReport={updateReport} onFilterArtisan={handleFilterArtisan}
            onReportAgain={duplicateReport}
            resolutionStatuses={resolutionStatuses}
          />
          {loadMoreReports && activeDashboardReports.length > 0 && (
             <div ref={observerTarget} className="h-10 w-full" aria-hidden="true" />
          )}
      </div>

      <CommentsModal
        isOpen={isCommentsModalOpen}
        onClose={() => {setIsCommentsModalOpen(false); setCommentsReport(null);}}
        report={commentsReport}
        currentUser={user}
        onUpdateReport={updateReport}
      />

      {selectedReport && (
        <>
            <AssignJobModal
                isOpen={isAssignModalOpen}
                onClose={() => setIsAssignModalOpen(false)}
                onSubmit={handleAssign}
                artisans={artisans}
            />
            <ResolveJobModal
                isOpen={isResolveModalOpen}
                onClose={() => setIsResolveModalOpen(false)}
                onSubmit={handleResolve}
                resolutionStatuses={resolutionStatuses}
                sections={sections}
                users={users}
            />
            <CompleteJobModal
                isOpen={isCompleteModalOpen}
                onClose={() => setIsCompleteModalOpen(false)}
                onSubmit={handleComplete}
            />
            <EditReportModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                report={selectedReport}
                onSubmit={updateReport}
                currentUser={user}
                artisans={artisans}
                resolutionStatuses={resolutionStatuses}
                sections={sections}
                users={users}
            />
        </>
      )}
      <CreateReportModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={addReport}
        user={user}
        workGroups={workGroups}
        operators={operators}
        addOperator={addOperator}
      />

      {!isScheduler && (
        <EditUserModal
          isOpen={isEditUserOpen}
          onClose={() => {
            setIsEditUserOpen(false);
            setUserToEdit(null);
          }}
          user={userToEdit}
          onSubmit={(userId, updates) => {
            if (updateUser) updateUser(userId, updates);
          }}
          workGroups={workGroups}
        />
      )}

      <ResetPasswordModal
        isOpen={isResetPasswordOpen}
        onClose={() => {
          setIsResetPasswordOpen(false);
          setUserToResetPassword(null);
        }}
        user={userToResetPassword}
        onSubmit={(userId, password) => {
          if (updateUser) updateUser(userId, { password });
        }}
      />
    </div>
  );
};

export default CoordinatorView;
