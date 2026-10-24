import React, { useState, useMemo } from 'react';
import CommentsModal from './modals/CommentsModal';
import { BreakdownReport, User, Role, Status, ResolutionStatus, AppView, ResolutionStatusItem, HandoverSection } from '../types';
import { 
  getProductionDayStart, 
  getProductionDayEnd, 
  formatDateForInput, 
  formatDateTime, 
  calculateDuration,
  isMaintenanceForeman,
  getUserDiscipline,
  isHandoverReport,
  matchesDisciplineHandover
} from '../utils';
import BreakdownTable from './BreakdownTable';

interface DailyReportViewProps {
  reports: BreakdownReport[];
  user: User;
  duplicateReport?: (reportId: string) => void;
  setCurrentView?: (view: AppView) => void;
  resolutionStatuses: ResolutionStatusItem[];
  sections?: HandoverSection[];
}

const DailyReportView: React.FC<DailyReportViewProps> = ({ 
  reports, 
  user, 
  duplicateReport, 
  setCurrentView, 
  resolutionStatuses,
  sections = []
}) => {
  const [isCommentsModalOpen, setIsCommentsModalOpen] = useState(false);
  const [commentsReport, setCommentsReport] = useState<BreakdownReport | null>(null);
  const handleOpenComments = (report: BreakdownReport) => {
    setCommentsReport(report);
    setIsCommentsModalOpen(true);
  };

  const [selectedDate, setSelectedDate] = useState<string>(formatDateForInput(new Date()));

  // Maintenance Foreman & Discipline detection
  const isMaint = isMaintenanceForeman(user);
  const userDiscipline = getUserDiscipline(user);

  // For Admin, Coordinator, or Scheduler, allow picking a discipline filter or viewing all
  const [selectedDisciplineFilter, setSelectedDisciplineFilter] = useState<string>('All');

  const activeDiscipline = isMaint && userDiscipline ? userDiscipline : selectedDisciplineFilter;

  const { productionStart, productionEnd, filteredReports } = useMemo(() => {
    const dateObj = new Date(selectedDate);
    // Set to 12:00 to avoid timezone shifting issues when just selecting a "day"
    dateObj.setHours(12, 0, 0, 0);
    
    // Calculate 06:00 start based on the selected calendar date
    const start = new Date(dateObj);
    start.setHours(6, 0, 0, 0);
    
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    // Initial date window filter (either reported in this window or handed over in this window)
    let dateFiltered = reports.filter(r => {
      const rTime = new Date(r.reportingTime);
      const reportedInWindow = rTime >= start && rTime < end;
      const resTime = r.resolutionTime ? new Date(r.resolutionTime) : null;
      const resolvedInWindow = resTime && resTime >= start && resTime < end;
      return reportedInWindow || resolvedInWindow;
    });

    // 1. If Maintenance Foreman: Strictly restricted to their own discipline's handed-over equipment
    if (isMaint && userDiscipline) {
      dateFiltered = dateFiltered.filter(r => {
        return isHandoverReport(r) && matchesDisciplineHandover(r, userDiscipline, user);
      });
    } 
    // 2. If Reporter or Ops Foreman: Filter by work group
    else if (user.role === Role.REPORTER || user.role === Role.OPS_FOREMAN) {
      dateFiltered = dateFiltered.filter(r => r.workGroup === user.workGroup);
    }
    // 3. For Admin / Scheduler / Coordinator: filter by selected discipline if not 'All'
    else if (activeDiscipline !== 'All') {
      dateFiltered = dateFiltered.filter(r => {
        return isHandoverReport(r) && matchesDisciplineHandover(r, activeDiscipline);
      });
    }
    
    // Sort by reporting time
    dateFiltered.sort((a, b) => new Date(a.reportingTime).getTime() - new Date(b.reportingTime).getTime());

    return { productionStart: start, productionEnd: end, filteredReports: dateFiltered };
  }, [selectedDate, reports, user, isMaint, userDiscipline, activeDiscipline]);

  const handlePrint = () => {
    window.print();
  };

  const handleReportAgain = (reportId: string) => {
    if(duplicateReport && window.confirm('Are you sure you want to report this fault again? This will create a new breakdown report.')) {
        duplicateReport(reportId);
        if (setCurrentView) {
            setCurrentView('dashboard');
        }
    }
  };

  const handleExportCsv = () => {
    if (filteredReports.length === 0) {
        alert("No reports to export for this date.");
        return;
    }

    const headers = [
        "ID", "Status", "Urgency", "Equipment", "Eq. Number", "Team Member", "Fault", 
        "Reporting Time", "Reporter", "Reporter Email", "Reporter #", "Work Group", 
        "Handover Section", "Notification #", "Assigned To", "Resolution Status", "Duration", "Completed Time"
    ];

    const rows = filteredReports.map(r => [
        r.id,
        r.status,
        r.urgency,
        `"${(r.equipment || '').replace(/"/g, '""')}"`,
        `"${(r.equipmentNumber || '').replace(/"/g, '""')}"`,
        `"${(r.operatorName || '').replace(/"/g, '""')}"`,
        `"${(r.reportedFault || '').replace(/"/g, '""')}"`,
        formatDateTime(r.reportingTime),
        `"${r.reporter?.name || ''}"`,
        `"${r.reporter?.email || ''}"`,
        r.reporter?.employeeNumber || '',
        r.workGroup || '',
        r.handoverSection || '',
        r.notificationNumber || '',
        `"${(r.assignments || []).map(a => a.artisanName).join(', ')}"`,
        r.resolutionStatus || '',
        calculateDuration(r.reportingTime, r.resolutionTime),
        r.completedTime ? formatDateTime(r.completedTime) : ''
    ]);

    const csvContent = headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");

    // Add BOM for Excel UTF-8 compatibility
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.setAttribute("href", url);
    const prefix = isMaint && userDiscipline ? `${userDiscipline.toLowerCase()}_handover_` : 'breakdown_report_';
    link.setAttribute("download", `${prefix}${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Build list of disciplines for non-restricted users
  const availableDisciplines = useMemo(() => {
    const list = new Set<string>();
    sections.forEach(s => list.add(s.name));
    list.add('Mechanical');
    list.add('Electrical');
    list.add('Technicians');
    list.add('Instrumentation');
    return Array.from(list);
  }, [sections]);

  return (
    <div className="flex flex-col h-full overflow-hidden print:bg-white print:text-black print:p-0 print:overflow-visible">
      <style>{`
        html { scroll-behavior: smooth; }
        @media print {
            @page { size: A4 landscape; margin: 5mm; }
            body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
            .break-before-page { page-break-before: always; }
        }
      `}</style>
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-3 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold">
              {isMaint && userDiscipline ? `${userDiscipline} Maintenance Daily Report` : 'Daily Production Reports'}
            </h2>
            {isMaint && userDiscipline && (
              <span className="bg-purple-900/40 text-purple-300 border border-purple-600/50 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Restricted to {userDiscipline}
              </span>
            )}
          </div>
          <p className="text-[10px] text-gray-400">
            {isMaint && userDiscipline 
              ? `Displaying all equipment handed over to the ${userDiscipline} discipline in the selected production window (06:00 - 06:00).`
              : 'Production window (06:00 - 06:00).'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Discipline selector for Admin/Schedulers/Coordinators */}
          {!isMaint && user.role !== Role.REPORTER && user.role !== Role.OPS_FOREMAN && (
            <div className="flex flex-col">
              <label className="text-[10px] text-gray-400 mb-0.5">Discipline Filter</label>
              <select
                value={selectedDisciplineFilter}
                onChange={(e) => setSelectedDisciplineFilter(e.target.value)}
                className="bg-gray-800 border border-gray-600 rounded p-1 text-[10px] text-white focus:ring-1 focus:ring-blue-500"
              >
                <option value="All">All Disciplines / Full Report</option>
                {availableDisciplines.map(d => (
                  <option key={d} value={d}>{d} (Handed Over)</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex flex-col">
              <label className="text-[10px] text-gray-400 mb-0.5">Production Date</label>
              <input 
                  type="date" 
                  value={selectedDate} 
                  onChange={(e) => setSelectedDate(e.target.value)} 
                  className="bg-gray-800 border border-gray-600 rounded p-1 text-[10px] text-white focus:ring-1 focus:ring-blue-500"
              />
          </div>
          <button onClick={handleExportCsv} className="bg-green-600 hover:bg-green-700 text-white font-bold py-1 px-3 rounded text-[10px] flex items-center transition">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export
          </button>
          <button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded text-[10px] flex items-center transition">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print
          </button>
        </div>
      </div>

      {/* Restriction Notice for Maintenance Foreman */}
      {isMaint && userDiscipline && (
        <div className="mb-2 bg-purple-950/30 border border-purple-500/30 px-3 py-1.5 rounded-lg flex items-center justify-between text-xs text-purple-200 print:hidden">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-purple-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>
              <strong>{userDiscipline} Foreman View:</strong> Showing only equipment handed over to your discipline. Access to other disciplines is restricted.
            </span>
          </div>
          <span className="text-[10px] font-bold bg-purple-900/60 px-2 py-0.5 rounded border border-purple-500/40">
            {filteredReports.length} Handover Equipment Found
          </span>
        </div>
      )}
      
      {/* Print Header */}
      <div className="hidden print:block mb-2 border-b-2 border-gray-800 pb-1">
          <h1 className="text-xl font-bold text-black">
            Daily Breakdown Report {isMaint && userDiscipline ? ` - ${userDiscipline} Maintenance Handover` : ''}
          </h1>
          <div className="flex justify-between mt-1 text-xs text-gray-700 font-medium">
              <p><strong>Date:</strong> {new Date(selectedDate).toLocaleDateString()}</p>
              <p><strong>Period:</strong> {formatDateTime(productionStart.toISOString())} &mdash; {formatDateTime(productionEnd.toISOString())}</p>
              <p><strong>Printed By:</strong> {user.name} ({user.role}{userDiscipline ? ` - ${userDiscipline}` : ''})</p>
          </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-2 pb-2 print:overflow-visible print:min-h-max print:h-auto print:pr-0 print:pb-0">
        {filteredReports.length === 0 ? (
             <div className="text-center py-10 bg-gray-800 rounded-lg border border-gray-700 print:bg-white print:border-gray-300">
                 <p className="text-gray-400 text-xs print:text-black">
                    {isMaint && userDiscipline 
                      ? `No equipment handed over to the ${userDiscipline} discipline found for this production date.`
                      : 'No breakdown reports found for the selected criteria.'}
                 </p>
             </div>
        ) : (
             <BreakdownTable onOpenComments={handleOpenComments} 
                reports={filteredReports} 
                user={user} 
                readOnly={true} 
                onReportAgain={handleReportAgain}
                resolutionStatuses={resolutionStatuses}
             />
        )}
      </div>
    
      <CommentsModal
        isOpen={isCommentsModalOpen}
        onClose={() => {setIsCommentsModalOpen(false); setCommentsReport(null);}}
        report={commentsReport}
        currentUser={user}
        onUpdateReport={() => {}}
      />
    </div>
  );
};

export default DailyReportView;
