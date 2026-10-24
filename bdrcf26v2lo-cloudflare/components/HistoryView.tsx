
import React, { useState, useEffect, useMemo } from 'react';
import CommentsModal from './modals/CommentsModal';
import { BreakdownReport, User, Role, Status, AppView, ResolutionStatusItem } from '../types';
import { formatDateTime, TimePeriod, TIME_PERIODS, TIME_PERIOD_HOURS, TIME_PERIOD_DAYS } from '../utils';
import { INITIAL_REPORTS } from '../constants';
import BreakdownTable from './BreakdownTable';

interface HistoryViewProps {
  reports: BreakdownReport[];
  user: User;
  duplicateReport?: (reportId: string) => void;
  setCurrentView?: (view: AppView) => void;
  resolutionStatuses: ResolutionStatusItem[];
  workGroups?: { id: string; name: string }[];
}

const HistoryView: React.FC<HistoryViewProps> = ({ reports, user, duplicateReport, setCurrentView, resolutionStatuses, workGroups = [] }) => {
  const [isCommentsModalOpen, setIsCommentsModalOpen] = useState(false);
  const [commentsReport, setCommentsReport] = useState<BreakdownReport | null>(null);
  const handleOpenComments = (report: BreakdownReport) => {
    setCommentsReport(report);
    setIsCommentsModalOpen(true);
  };

  const [period, setPeriod] = useState<TimePeriod>('All');
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);

  const toggleGroup = (groupName: string) => {
    setSelectedGroups(prev =>
      prev.includes(groupName)
        ? prev.filter(g => g !== groupName)
        : [...prev, groupName]
    );
  };

  const [fetchedReports, setFetchedReports] = useState<BreakdownReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      const now = new Date();
      const cutoff = new Date();
      const hoursBack = TIME_PERIOD_HOURS[period];
      const daysBack = TIME_PERIOD_DAYS[period];
      if (hoursBack !== undefined) cutoff.setHours(now.getHours() - hoursBack);
      else if (daysBack !== undefined) cutoff.setDate(now.getDate() - daysBack);
      else if (period === 'All') cutoff.setFullYear(now.getFullYear() - 10);

      try {
        const cached = JSON.parse(localStorage.getItem('cache_reports') || JSON.stringify(INITIAL_REPORTS));
        let fetched = cached.filter((r: BreakdownReport) => new Date(r.reportingTime).getTime() >= cutoff.getTime());
        
        if (user.role === Role.REPORTER || user.role === Role.OPS_FOREMAN) {
          fetched = fetched.filter((r: BreakdownReport) => r.workGroup === user.workGroup);
        }
        
        setFetchedReports(fetched);
      } catch (error) {
        console.error("Error fetching history:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchHistory();
  }, [period, user]);

  const handleExportCsv = () => {
    if (filteredReports.length === 0) {
        alert("No reports to export.");
        return;
    }

    const headers = [
        "ID", "Status", "Urgency", "Equipment", "Eq. Number", "Team Member", "Fault", 
        "Reporting Time", "Reporter", "Reporter Email", "Reporter #", "Work Group", 
        "Notification #", "Assigned To", "Resolution Status", "Completed Time"
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
        r.notificationNumber || '',
        `"${(r.assignments || []).map(a => a.artisanName).join(', ')}"`,
        r.resolutionStatus || '',
        r.completedTime ? formatDateTime(r.completedTime) : ''
    ]);

    const csvContent = headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `breakdown_history_${period.replace(' ', '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleReportAgain = async (reportId: string) => {
    if(duplicateReport && window.confirm('Are you sure you want to report this fault again? This will create a new breakdown report.')) {
        try {
          await duplicateReport(reportId);
          alert('Report successfully re-submitted and added to active breakdowns.');
          if (setCurrentView) {
              setCurrentView('dashboard');
          }
        } catch (e) {
          console.error("Failed to re-report:", e);
          alert('Failed to re-report fault.');
        }
    }
  };

  const filteredReports = useMemo(() => {
     let result = fetchedReports;

     // 1. Filter by selected areas (selectedGroups)
     if (selectedGroups.length > 0) {
       result = result.filter(r => r.workGroup && selectedGroups.includes(r.workGroup));
     }

     // 2. Filter by search query
     if (searchQuery.trim()) {
       const lowerQuery = searchQuery.toLowerCase();
       result = result.filter(r => {
          return (
              (r.equipment && r.equipment.toLowerCase().includes(lowerQuery)) ||
              (r.equipmentNumber && r.equipmentNumber.toLowerCase().includes(lowerQuery)) ||
              (r.operatorName && r.operatorName.toLowerCase().includes(lowerQuery)) ||
              (r.reportedFault && r.reportedFault.toLowerCase().includes(lowerQuery)) ||
              (r.reporter?.name && r.reporter.name.toLowerCase().includes(lowerQuery)) ||
              (r.assignments && r.assignments.some(a => a.artisanName.toLowerCase().includes(lowerQuery))) ||
              (r.resolutionStatus && r.resolutionStatus.toLowerCase().includes(lowerQuery)) ||
              (r.resolutionNotes && r.resolutionNotes.toLowerCase().includes(lowerQuery)) ||
              (r.status && r.status.toLowerCase().includes(lowerQuery)) ||
              (r.notificationNumber && r.notificationNumber.toLowerCase().includes(lowerQuery)) ||
              (r.whatWasWrong && r.whatWasWrong.toLowerCase().includes(lowerQuery)) ||
              (formatDateTime(r.reportingTime).toLowerCase().includes(lowerQuery))
          );
       });
     }

     return result;
  }, [fetchedReports, selectedGroups, searchQuery]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex justify-between items-center mb-3">
        <div>
          <h2 className="text-xl font-bold">Historical Analysis</h2>
          <p className="text-[10px] text-gray-400">Review data for the selected period.</p>
        </div>
        <div className="flex items-center space-x-3">
           <div className="relative w-64 mr-2">
             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
               <svg className="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                 <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
               </svg>
             </div>
             <input
               type="text"
               placeholder="Search history..."
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               className="w-full pl-9 pr-3 py-1.5 bg-gray-800 border border-gray-700 rounded-md text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
             />
           </div>
          <button onClick={handleExportCsv} disabled={loading} className="bg-green-600 hover:bg-green-700 text-white font-bold py-1.5 px-3 rounded text-[10px] flex items-center transition duration-200">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export
          </button>
        </div>
      </div>

      {/* Areas and Time indexing Filter Bar */}
      <div className="mb-4 bg-gray-800/50 p-3 rounded-lg border border-gray-700 space-y-2">
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

        {/* Time Filters */}
        <div className="flex flex-wrap items-center gap-4 pt-1 border-t border-gray-700/50">
           <div className="flex items-center space-x-1">
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mr-1">Time:</span>
              <div className="flex flex-wrap gap-0.5 bg-gray-900/50 rounded-lg p-0.5 border border-gray-700">
                  {TIME_PERIODS.map((p) => (
                      <button
                          key={p}
                          onClick={() => setPeriod(p)}
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all ${period === p ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                      >
                          {p}
                      </button>
                  ))}
              </div>
              {(selectedGroups.length > 0 || period !== 'All') && (
                <button 
                  onClick={() => { setSelectedGroups([]); setPeriod('All'); }}
                  className="text-[10px] text-red-400 hover:text-red-300 font-semibold underline ml-3"
                >
                  Reset Filters
                </button>
              )}
           </div>
        </div>
      </div>
      
      {loading ? (
           <div className="text-center py-10 bg-gray-800 rounded-lg border border-gray-700">
               <p className="text-gray-400 text-xs animate-pulse">Loading history...</p>
           </div>
      ) : filteredReports.length === 0 ? (
           <div className="text-center py-10 bg-gray-800 rounded-lg border border-gray-700">
               <p className="text-gray-400 text-xs">No records found for the selected filter.</p>
           </div>
      ) : (
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-2 pb-2">
              <BreakdownTable onOpenComments={handleOpenComments} 
                  reports={filteredReports} 
                  user={user} 
                  readOnly={false} 
                  onReportAgain={handleReportAgain}
                  resolutionStatuses={resolutionStatuses}
              />
          </div>
      )}
    
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

export default HistoryView;
