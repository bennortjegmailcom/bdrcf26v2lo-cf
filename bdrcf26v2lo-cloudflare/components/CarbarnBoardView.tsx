import React, { useState, useMemo } from 'react';
import { BreakdownReport, User, Status, Role, WorkGroup, Artisan, ResolutionStatusItem } from '../types';
import EquipmentOverviewModal from './modals/EquipmentOverviewModal';
import EditReportModal from './modals/EditReportModal';
import { 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Wrench, 
  User as UserIcon, 
  Hash, 
  ExternalLink, 
  Train,
  ShieldAlert,
  Flame,
  ArrowUpDown,
  Plus,
  Trash2,
  Edit3
} from 'lucide-react';

interface CarbarnBoardViewProps {
  user: User;
  reports: BreakdownReport[];
  updateReport: (reportId: string, updates: Partial<BreakdownReport>) => void;
  deleteReport?: (reportId: string) => void;
  addReport?: (reportData: Omit<BreakdownReport, 'id' | 'reportingTime' | 'reporter' | 'status'>, employeeNumber?: string) => void;
  workGroups?: WorkGroup[];
  artisans?: Artisan[];
  resolutionStatuses?: ResolutionStatusItem[];
  onOpenComments?: (report: BreakdownReport) => void;
}

interface ColumnConfig {
  id: string;
  title: string;
  status: Status | 'DRAFT';
  bgColor: string;
  borderColor: string;
  headerColor: string;
  icon: React.ReactNode;
}

const COLUMNS: ColumnConfig[] = [
  {
    id: 'draft',
    title: 'Draft / Pending',
    status: Status.DRAFT,
    bgColor: 'bg-gray-900/50',
    borderColor: 'border-gray-700/60',
    headerColor: 'bg-gray-800 text-gray-200 border-gray-700',
    icon: <Clock className="w-4 h-4 text-gray-400" />
  },
  {
    id: 'active',
    title: 'Active Breakdown',
    status: Status.ACTIVE,
    bgColor: 'bg-red-950/20',
    borderColor: 'border-red-950/40',
    headerColor: 'bg-red-950/50 text-red-300 border-red-900/50',
    icon: <Flame className="w-4 h-4 text-red-400" />
  },
  {
    id: 'assigned',
    title: 'Assigned / In Progress',
    status: Status.ASSIGNED,
    bgColor: 'bg-amber-950/20',
    borderColor: 'border-amber-950/40',
    headerColor: 'bg-amber-950/50 text-amber-300 border-amber-900/50',
    icon: <Wrench className="w-4 h-4 text-amber-400" />
  },
  {
    id: 'resolved',
    title: 'Resolved / Handover',
    status: Status.RESOLVED,
    bgColor: 'bg-blue-950/20',
    borderColor: 'border-blue-950/40',
    headerColor: 'bg-blue-950/50 text-blue-300 border-blue-900/50',
    icon: <CheckCircle2 className="w-4 h-4 text-blue-400" />
  },
  {
    id: 'completed',
    title: 'Completed',
    status: Status.COMPLETED,
    bgColor: 'bg-emerald-950/20',
    borderColor: 'border-emerald-950/40',
    headerColor: 'bg-emerald-950/50 text-emerald-300 border-emerald-900/50',
    icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />
  }
];

export const CarbarnBoardView: React.FC<CarbarnBoardViewProps> = ({
  user,
  reports,
  updateReport,
  deleteReport,
  addReport,
  workGroups = [],
  artisans = [],
  resolutionStatuses = [],
  onOpenComments
}) => {
  const [selectedReport, setSelectedReport] = useState<BreakdownReport | null>(null);
  const [isOverviewOpen, setIsOverviewOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'area' | 'responsibility' | 'urgency' | 'time'>('area');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  const [editingReport, setEditingReport] = useState<BreakdownReport | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Admin, Reporters, and Schedulers have CRUD rights on all they see
  const hasCrudRights = [Role.ADMIN, Role.REPORTER, Role.SCHEDULER].includes(user.role);

  // Filter reports according to exact role responsibilities & area constraints
  const visibleReports = useMemo(() => {
    return reports.filter(r => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchEq = r.equipment?.toLowerCase().includes(q) || false;
        const matchNum = r.equipmentNumber?.toLowerCase().includes(q) || false;
        const matchFault = r.reportedFault?.toLowerCase().includes(q) || false;
        if (!matchEq && !matchNum && !matchFault) return false;
      }

      const isOperationalDowntime = 
        r.workGroup?.toLowerCase() === 'operations' || 
        r.isOperationalDowntime || 
        r.reportedFault?.toLowerCase().includes('operational downtime');

      const userArea = user.workGroup?.toLowerCase();
      const reportArea = r.workGroup?.toLowerCase();

      // 1. Admin sees all bookings/reports
      if (user.role === Role.ADMIN) {
        return true;
      }

      // 2. Reporters and Operational Shift Foremen: see breakdowns in their area and operational downtimes in their area
      if (user.role === Role.REPORTER || user.role === Role.OPS_FOREMAN) {
        if (userArea && userArea !== 'all') {
          return reportArea === userArea;
        }
        return true;
      }

      // 3. Scheduler and Maintenance Shift Foreman: see all except operational downtimes
      if (user.role === Role.SCHEDULER || user.role === Role.FOREMAN) {
        if (isOperationalDowntime) return false;
        return true;
      }

      // 4. Maintenance Supervisors: see their own responsible downtime sortable by area
      if (
        user.role === Role.MECH_SUPERVISOR || 
        user.role === Role.ELEC_SUPERVISOR || 
        user.role === Role.INST_SUPERVISOR || 
        user.role === Role.TECH_SUPERVISOR
      ) {
        const disciplineMap: Record<string, string[]> = {
          [Role.MECH_SUPERVISOR]: ['mechanical', 'millwright', 'fitter', 'plater'],
          [Role.ELEC_SUPERVISOR]: ['electrical', 'electrician'],
          [Role.INST_SUPERVISOR]: ['instrumentation'],
          [Role.TECH_SUPERVISOR]: ['technical', 'technicians', 'artisan aide'],
        };
        const allowedDisciplines = disciplineMap[user.role] || [];
        
        const matchesDiscipline = (r.assignments || []).some(a => 
          allowedDisciplines.some(d => a.responsibility?.toLowerCase().includes(d) || a.specialty?.toLowerCase().includes(d))
        ) || allowedDisciplines.some(d => 
          r.handoverSection?.toLowerCase().includes(d) || 
          r.reportedFault?.toLowerCase().includes(d) ||
          r.workGroup?.toLowerCase().includes(d)
        );

        return matchesDiscipline;
      }

      if (user.role === Role.GUEST) {
        return true;
      }

      return true;
    });
  }, [reports, searchQuery, user]);

  const getReportsForColumn = (statusKey: Status | 'DRAFT') => {
    const colReports = visibleReports.filter(r => {
      if (statusKey === Status.DRAFT) {
        return r.status === Status.DRAFT || r.isDraft;
      }
      return r.status === statusKey;
    });

    return colReports.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'area') {
        const areaA = a.workGroup || '';
        const areaB = b.workGroup || '';
        comparison = areaA.localeCompare(areaB);
      } else if (sortBy === 'responsibility') {
        const respA = getResponsibilityText(a);
        const respB = getResponsibilityText(b);
        comparison = respA.localeCompare(respB);
      } else if (sortBy === 'urgency') {
        comparison = b.urgency - a.urgency;
      } else if (sortBy === 'time') {
        comparison = new Date(b.reportingTime).getTime() - new Date(a.reportingTime).getTime();
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  };

  const handleCardClick = (report: BreakdownReport) => {
    setSelectedReport(report);
    setIsOverviewOpen(true);
  };

  const getResponsibilityText = (report: BreakdownReport) => {
    if (report.assignments && report.assignments.length > 0) {
      return report.assignments.map(a => a.artisanName).join(', ');
    }
    if (report.workGroup) {
      return `${report.workGroup} Team`;
    }
    return report.reporter?.name || 'Unassigned';
  };

  const getUrgencyBadge = (urgency: number) => {
    if (urgency >= 8) return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-900/60 text-red-200 border border-red-500/40">Critical ({urgency})</span>;
    if (urgency >= 5) return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-900/60 text-amber-200 border border-amber-500/40">High ({urgency})</span>;
    return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-900/60 text-blue-200 border border-blue-500/40">Normal ({urgency})</span>;
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-900 overflow-hidden p-3 lg:p-4 space-y-4">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-gray-800/80 border border-gray-700/60 p-3.5 rounded-xl shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Train className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">Carbarn Workflow Board</h2>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                Live Kanban ({visibleReports.length} visible)
              </span>
            </div>
            <p className="text-xs text-gray-400">Role-based responsibility tracking sorted by area and discipline</p>
          </div>
        </div>

        {/* Controls: Search, Sort & CRUD */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Sort Selector */}
          <div className="flex items-center gap-1.5 bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-1.5">
            <span className="text-[11px] text-gray-400 font-medium">Sort by:</span>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="bg-transparent text-white text-xs focus:outline-none font-semibold cursor-pointer"
            >
              <option value="area" className="bg-gray-900">Area</option>
              <option value="responsibility" className="bg-gray-900">Responsibility</option>
              <option value="urgency" className="bg-gray-900">Urgency</option>
              <option value="time" className="bg-gray-900">Time Reported</option>
            </select>
            <button
              onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
              className="text-gray-400 hover:text-white p-0.5 rounded"
              title="Toggle sort direction"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Search Bar */}
          <div className="w-full sm:w-60">
            <input
              type="text"
              placeholder="Search equipment, tag, or defect..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Kanban Columns Grid */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-3 overflow-x-auto pb-2 min-h-0">
        {COLUMNS.map(col => {
          const colReports = getReportsForColumn(col.status);
          return (
            <div 
              key={col.id} 
              className={`flex flex-col rounded-xl border ${col.borderColor} ${col.bgColor} overflow-hidden shadow-md min-w-[260px]`}
            >
              {/* Column Header */}
              <div className={`px-3 py-2.5 border-b flex items-center justify-between ${col.headerColor}`}>
                <div className="flex items-center gap-2">
                  {col.icon}
                  <span className="text-xs font-bold tracking-wide">{col.title}</span>
                </div>
                <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-black/30 text-white border border-white/10">
                  {colReports.length}
                </span>
              </div>

              {/* Column Cards Container */}
              <div className="flex-1 p-2 overflow-y-auto space-y-2.5 custom-scrollbar">
                {colReports.length === 0 ? (
                  <div className="h-32 flex items-center justify-center text-gray-500 text-xs text-center p-4 border border-dashed border-gray-800 rounded-lg">
                    No reports in {col.title.toLowerCase()}
                  </div>
                ) : (
                  colReports.map(report => {
                    const responsibility = getResponsibilityText(report);
                    return (
                      <div
                        key={report.id}
                        onClick={() => handleCardClick(report)}
                        className="group relative bg-gray-800/90 hover:bg-gray-800 border border-gray-700/80 hover:border-blue-500/50 rounded-xl p-3 shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-2.5"
                      >
                        {/* Top Row: Equipment Name & Urgency */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="truncate">
                            <div className="text-xs font-bold text-white group-hover:text-blue-300 transition-colors truncate">
                              {report.equipment || 'Unnamed Equipment'}
                            </div>
                            <div className="text-[11px] text-gray-400 font-mono flex items-center gap-1 mt-0.5">
                              <Hash className="w-3 h-3 text-gray-500" />
                              <span>{report.equipmentNumber || 'N/A'}</span>
                              <span className="text-gray-600">•</span>
                              <span className="text-gray-400 font-semibold text-blue-300">{report.workGroup}</span>
                            </div>
                          </div>
                          <div className="flex-shrink-0">
                            {getUrgencyBadge(report.urgency)}
                          </div>
                        </div>

                        {/* Defect Summary */}
                        <div className="text-xs text-gray-300 bg-gray-950/40 p-2 rounded-lg border border-gray-800 line-clamp-2 leading-relaxed">
                          {report.reportedFault || 'No defect description provided.'}
                        </div>

                        {/* Responsibility & Time Footer */}
                        <div className="pt-2 border-t border-gray-700/60 flex items-center justify-between text-[11px]">
                          <div className="flex items-center gap-1.5 text-gray-300 truncate max-w-[150px]" title={`Responsibility: ${responsibility}`}>
                            <Wrench className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                            <span className="truncate font-medium">{responsibility}</span>
                          </div>
                          <div className="text-gray-400 font-mono flex-shrink-0">
                            {new Date(report.reportingTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>

                        {/* CRUD action buttons on hover if allowed */}
                        {hasCrudRights && (
                          <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900/90 p-1 rounded-md border border-gray-700 shadow-md" onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => {
                                setEditingReport(report);
                                setIsEditModalOpen(true);
                              }}
                              className="p-1 text-blue-400 hover:text-white rounded hover:bg-blue-600/50"
                              title="Edit report"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            {deleteReport && (
                              <button
                                onClick={() => {
                                  if (window.confirm(`Are you sure you want to delete report ${report.equipment} (${report.equipmentNumber})?`)) {
                                    deleteReport(report.id);
                                  }
                                }}
                                className="p-1 text-red-400 hover:text-white rounded hover:bg-red-600/50"
                                title="Delete report"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Equipment Overview Modal */}
      <EquipmentOverviewModal
        isOpen={isOverviewOpen}
        onClose={() => {
          setIsOverviewOpen(false);
          setSelectedReport(null);
        }}
        report={selectedReport}
        currentUser={user}
        onOpenComments={onOpenComments}
      />

      {/* Edit Report Modal */}
      {isEditModalOpen && editingReport && (
        <EditReportModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingReport(null);
          }}
          report={editingReport}
          currentUser={user}
          artisans={artisans}
          resolutionStatuses={resolutionStatuses}
          onSubmit={(reportId, updates) => {
            updateReport(reportId, updates);
            setIsEditModalOpen(false);
            setEditingReport(null);
          }}
        />
      )}
    </div>
  );
};

export default CarbarnBoardView;
