import React, { useState, useMemo } from 'react';
import { BreakdownReport, User, Status, Role } from '../types';
import EquipmentOverviewModal from './modals/EquipmentOverviewModal';
import { 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Wrench, 
  User as UserIcon, 
  Hash, 
  ExternalLink, 
  Columns,
  ShieldAlert,
  Flame
} from 'lucide-react';

interface KanbanBoardViewProps {
  user: User;
  reports: BreakdownReport[];
  updateReport: (reportId: string, updates: Partial<BreakdownReport>) => void;
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

export const KanbanBoardView: React.FC<KanbanBoardViewProps> = ({
  user,
  reports,
  updateReport,
  onOpenComments
}) => {
  const [selectedReport, setSelectedReport] = useState<BreakdownReport | null>(null);
  const [isOverviewOpen, setIsOverviewOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter reports by user context
  const visibleReports = useMemo(() => {
    return reports.filter(r => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchEq = r.equipment?.toLowerCase().includes(q) || false;
        const matchNum = r.equipmentNumber?.toLowerCase().includes(q) || false;
        const matchFault = r.reportedFault?.toLowerCase().includes(q) || false;
        if (!matchEq && !matchNum && !matchFault) return false;
      }
      
      if (user.role === Role.ADMIN || user.role === Role.COORDINATOR || user.role === Role.GUEST || user.role === Role.SCHEDULER) {
        return true;
      }
      if (user.workGroup && user.workGroup !== 'All') {
        return r.workGroup?.toLowerCase() === user.workGroup.toLowerCase();
      }
      return true;
    });
  }, [reports, searchQuery, user]);

  const getReportsForColumn = (statusKey: Status | 'DRAFT') => {
    return visibleReports.filter(r => {
      if (statusKey === Status.DRAFT) {
        return r.status === Status.DRAFT || r.isDraft;
      }
      return r.status === statusKey;
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-gray-800/80 border border-gray-700/60 p-3.5 rounded-xl shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Columns className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">Kanban Workflow Board</h2>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                Live Kanban
              </span>
            </div>
            <p className="text-xs text-gray-400">Real-time lifecycle tracking of breakdown reports across plant maintenance stages</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="w-full sm:w-72">
          <input
            type="text"
            placeholder="Search equipment, tag, or defect..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
          />
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
                              <span className="text-gray-400">{report.workGroup}</span>
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
                          <div className="flex items-center gap-1.5 text-gray-300 truncate max-w-[160px]" title={`Responsibility: ${responsibility}`}>
                            <Wrench className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                            <span className="truncate font-medium">{responsibility}</span>
                          </div>
                          <div className="text-gray-400 font-mono flex-shrink-0">
                            {new Date(report.reportingTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>

                        {/* Hover indicator */}
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Equipment Overview Modal on Card Click */}
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
    </div>
  );
};

export default KanbanBoardView;
