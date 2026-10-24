import React, { useState, useMemo } from 'react';
import CommentsModal from './modals/CommentsModal';
import { BreakdownReport, Status, User, Artisan, Assignment, Role, Shift, ResolutionStatusItem, ResolutionStatus, HandoverSection, WorkGroup } from '../types';
import { getProductionDayStart, getProductionDayEnd, formatDateForInput, isMaintenanceForeman, getUserDiscipline, matchesDisciplineHandover } from '../utils';
import BreakdownTable from './BreakdownTable';
import AssignJobModal from './modals/AssignJobModal';
import ResolveJobModal from './modals/ResolveJobModal';
import CompleteJobModal from './modals/CompleteJobModal';
import EditReportModal from './modals/EditReportModal';

interface HandOverReportViewProps {
  reports: BreakdownReport[];
  artisans: Artisan[];
  resolutionStatuses: ResolutionStatusItem[];
  updateReport: (reportId: string, updates: Partial<BreakdownReport>) => void;
  user: User;
  duplicateReport?: (reportId: string) => void;
  sections?: HandoverSection[];
  users?: User[];
  workGroups?: WorkGroup[];
}

const HandOverReportView: React.FC<HandOverReportViewProps> = ({ 
  reports, 
  artisans, 
  resolutionStatuses, 
  updateReport, 
  user, 
  duplicateReport,
  sections = [],
  users = [],
  workGroups = []
}) => {
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCommentsModalOpen, setIsCommentsModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<BreakdownReport | null>(null);
  const [commentsReport, setCommentsReport] = useState<BreakdownReport | null>(null);
  const handleOpenComments = (report: BreakdownReport) => {
    setCommentsReport(report);
    setIsCommentsModalOpen(true);
  };
  const [copyButtonText, setCopyButtonText] = useState('Copy Table');

  // Artisan Filter State
  const [selectedArtisan, setSelectedArtisan] = useState<{ id: string, name: string } | null>(null);

  // Acknowledgment Filter State
  const [ackFilter, setAckFilter] = useState<'all' | 'pending' | 'acknowledged'>('all');

  const isMaint = isMaintenanceForeman(user);
  const userDiscipline = getUserDiscipline(user);

  // Area / WorkGroup Filter State
  const [selectedGroup, setSelectedGroup] = useState<string>(() => {
    return user.workGroup || 'All';
  });

  // Dynamic Tabs setup with standard disciplines merged with custom sections
  const tabs = useMemo(() => {
    if (isMaint && userDiscipline) {
      return [userDiscipline];
    }
    const defaultDisciplines = ['Mechanical', 'Electrical', 'Technicians', 'Instrumentation', 'Operations', 'Services'];
    const customNames = sections.map(s => s.name);
    const merged = Array.from(new Set([...defaultDisciplines, ...customNames]));
    return ['All', 'Next Shift', ...merged];
  }, [sections, isMaint, userDiscipline]);

  const [activeTab, setActiveTab] = useState<string>(() => {
    if (isMaint && userDiscipline) return userDiscipline;
    return 'All';
  });

  const getReportsForTab = (tabName: string) => {
    let filtered = reports;

    if (selectedGroup !== 'All') {
      filtered = filtered.filter(r => r.workGroup === selectedGroup);
    }

    if (isMaint && userDiscipline) {
      filtered = filtered.filter(r => matchesDisciplineHandover(r, userDiscipline, user));
    } else if (tabName === 'Next Shift') {
      filtered = filtered.filter(r => r.isNextShift);
    } else if (tabName !== 'All') {
      filtered = filtered.filter(r => r.handoverSection === tabName || matchesDisciplineHandover(r, tabName));
    }

    if (ackFilter === 'pending') {
      filtered = filtered.filter(r => !r.dayshiftAcknowledged);
    } else if (ackFilter === 'acknowledged') {
      filtered = filtered.filter(r => !!r.dayshiftAcknowledged);
    }

    if (selectedArtisan) {
      filtered = filtered.filter(r => r.assignments && r.assignments.some(a => a.artisanId === selectedArtisan.id));
    }

    return filtered;
  };

  const filteredTabReports = useMemo(() => {
    return getReportsForTab(activeTab);
  }, [reports, activeTab, selectedArtisan, selectedGroup, ackFilter, isMaint, userDiscipline, user]);

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
    whatWasWrong: string, 
    resolutionStatus: ResolutionStatus, 
    resolutionTime: string, 
    resolutionNotes?: string, 
    resolutionEmployeeNumber?: string,
    handoverSection?: string,
    handoverRecipientId?: string,
    handoverRecipientName?: string,
    handbackNotes?: string,
    handoverSafetyVerified?: boolean,
    dayshiftAcknowledged?: boolean
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

  const handlePrint = () => {
    window.print();
  };

  const handleCopyTable = () => {
    if (filteredTabReports.length === 0) {
        alert("No reports to copy.");
        return;
    }

    const rows = filteredTabReports.map(r => [
        r.workGroup,
        r.equipmentNumber,
        r.equipment,
        (r.reportedFault || '').replace(/\s+/g, ' ').trim(),
        (r.whatWasWrong || '').replace(/\s+/g, ' ').trim(),
        r.handoverSection || '',
        r.handoverRecipientName || '',
        (r.handbackNotes || '').replace(/\s+/g, ' ').trim(),
        r.dayshiftAcknowledged ? `Acknowledged (${r.dayshiftAcknowledgedBy || 'Dayshift'})` : 'Pending Ack',
        r.notificationNumber || ''
    ]);

    const tableContent = rows.map(e => e.join("\t")).join("\n");
    
    navigator.clipboard.writeText(tableContent).then(() => {
        setCopyButtonText('Copied!');
        setTimeout(() => setCopyButtonText('Copy Table'), 2000);
    }, (err) => {
        alert('Failed to copy table.');
        console.error('Copy failed', err);
    });
  };

  const handleExportCSV = () => {
    if (filteredTabReports.length === 0) {
      alert("No reports to export.");
      return;
    }
    const headers = [
      'Area',
      'FG Number',
      'Equipment',
      'Reported Fault',
      'Work Done / What Was Wrong',
      'Resolution Status',
      'Handover Section',
      'Handover Recipient',
      'Handback Notes',
      'Safety Verified',
      'Dayshift Ack Status',
      'Acknowledged By',
      'Acknowledged At',
      'Notification #'
    ];
    const escapeCsv = (val: string) => `"${(val || '').replace(/"/g, '""')}"`;
    const csvRows = [
      headers.map(escapeCsv).join(','),
      ...filteredTabReports.map(r => [
        r.workGroup || '',
        r.equipmentNumber || '',
        r.equipment || '',
        (r.reportedFault || '').replace(/\s+/g, ' ').trim(),
        (r.whatWasWrong || '').replace(/\s+/g, ' ').trim(),
        r.resolutionStatus || '',
        r.handoverSection || '',
        r.handoverRecipientName || '',
        (r.handbackNotes || '').replace(/\s+/g, ' ').trim(),
        r.handoverSafetyVerified ? 'Yes' : 'No',
        r.dayshiftAcknowledged ? 'Acknowledged' : 'Pending',
        r.dayshiftAcknowledgedBy || '',
        r.dayshiftAcknowledgedAt ? new Date(r.dayshiftAcknowledgedAt).toLocaleString() : '',
        r.notificationNumber || ''
      ].map(escapeCsv).join(','))
    ];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `handover-report-${activeTab.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleFilterArtisan = (id: string, name: string) => {
    setSelectedArtisan({ id, name });
  };


  return (
    <div className="flex flex-col h-full overflow-hidden bg-gray-900 text-white p-6 print:bg-white print:text-black print:p-0">
      <style>{`
        @media print {
            @page {
                size: A4 landscape;
                margin: 5mm;
            }
            body {
                print-color-adjust: exact;
                -webkit-print-color-adjust: exact;
            }
            .no-print {
                display: none !important;
            }
        }
      `}</style>
      <div className="mb-6 flex flex-wrap justify-between items-center gap-4 no-print">
        <div className="flex items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-3xl font-bold text-white">
                  {isMaint && userDiscipline ? `${userDiscipline} Hand Over Jobs` : 'Hand Over / Incomplete Jobs'}
                </h2>
                {isMaint && userDiscipline && (
                  <span className="bg-purple-900/40 text-purple-300 border border-purple-600/50 text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    {userDiscipline} Restricted
                  </span>
                )}
              </div>
              <p className="text-gray-400 mt-1">
                {isMaint && userDiscipline
                  ? `Persistent list of equipment and jobs handed over to the ${userDiscipline} discipline requiring follow-up.`
                  : 'A persistent list of all jobs handed over to day shift or requiring follow-up action across sections.'}
              </p>
            </div>
            {selectedArtisan && (
              <div className="flex items-center bg-blue-900/40 border border-blue-500 text-blue-200 px-3 py-1 rounded-full text-xs font-bold">
                Artisan: {selectedArtisan.name}
                <button 
                  onClick={() => setSelectedArtisan(null)}
                  className="ml-2 hover:text-white transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            )}
        </div>
        <div className="flex items-center space-x-3">
            <button onClick={handleCopyTable} className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-3.5 text-sm rounded flex items-center transition-all duration-200">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
                {copyButtonText}
            </button>
            <button onClick={handleExportCSV} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-3.5 text-sm rounded flex items-center transition-all duration-200">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export CSV
            </button>
            <button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3.5 text-sm rounded flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print Report
            </button>
        </div>
      </div>
      
      {/* Print Header */}
      <div className="hidden print:block mb-2 border-b-2 border-gray-800 pb-1">
            <h1 className="text-xl font-bold text-black">Hand Over Jobs - {activeTab}</h1>
            <div className="flex justify-between mt-1 text-xs text-gray-700 font-medium">
                <p><strong>Date Printed:</strong> {new Date().toLocaleDateString()}</p>
                <p><strong>Printed By:</strong> {user.name}</p>
            </div>
      </div>
      
      {/* Area & Acknowledgment Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 bg-gray-800/40 p-2 rounded-lg border border-gray-700/60 no-print">
        <div className="flex flex-wrap items-center gap-2">
          {workGroups.length > 0 && (
            <>
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mr-1">Area:</span>
              <button
                onClick={() => setSelectedGroup('All')}
                className={`px-2.5 py-0.5 text-xs font-bold rounded-full border transition-all ${
                  selectedGroup === 'All'
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                }`}
              >
                All Areas
              </button>
              {workGroups.map(wg => (
                <button
                  key={wg.id}
                  onClick={() => setSelectedGroup(wg.name)}
                  className={`px-2.5 py-0.5 text-xs font-bold rounded-full border transition-all ${
                    selectedGroup === wg.name
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {wg.name}
                </button>
              ))}
            </>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mr-1">Receipt Status:</span>
          {(['all', 'pending', 'acknowledged'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setAckFilter(mode)}
              className={`px-2.5 py-0.5 text-xs font-bold rounded-full border transition-all capitalize ${
                ackFilter === mode
                  ? mode === 'pending'
                    ? 'bg-red-600 border-red-500 text-white'
                    : mode === 'acknowledged'
                      ? 'bg-emerald-600 border-emerald-500 text-white'
                      : 'bg-purple-600 border-purple-500 text-white'
                  : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {mode === 'all' ? 'All Handovers' : mode === 'pending' ? 'Pending Ack' : 'Acknowledged'}
            </button>
          ))}
        </div>
      </div>

      {/* Render Tabs */}
      <div className="flex items-center mb-4 mt-1 no-print overflow-x-auto pb-2 custom-scrollbar">
          <div className="flex bg-gray-900/50 rounded-lg p-1 border border-gray-700 w-full min-w-max gap-1">
              {tabs.map((tab) => {
                  const count = getReportsForTab(tab).length;
                  return (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex-1 px-3.5 py-2 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-1.5 ${activeTab === tab ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
                    >
                        <span>{tab}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === tab ? 'bg-blue-800 text-blue-100' : 'bg-gray-800 text-gray-400'}`}>
                          {count}
                        </span>
                    </button>
                  );
              })}
          </div>
      </div>
      
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-2 pb-2">
        {(() => {
          return filteredTabReports.length > 0 ? (
              <BreakdownTable onOpenComments={handleOpenComments} reports={filteredTabReports}
                  user={user}
                  onAssign={openAssignModal}
                  onResolve={openResolveModal}
                  onComplete={openCompleteModal}
                  onEdit={openEditModal}
                  onUpdateReport={updateReport} onFilterArtisan={handleFilterArtisan}
                  onReportAgain={duplicateReport}
                  resolutionStatuses={resolutionStatuses}
              />
          ) : (
              <div className="text-gray-500 italic p-4 text-center">No handed over reports for this tab.</div>
          )
        })()}

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
    </div>
  );
};

export default HandOverReportView;
