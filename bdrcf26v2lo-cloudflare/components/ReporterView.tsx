import CommentsModal from './modals/CommentsModal';

import React, { useState, useMemo } from 'react';
import { User, BreakdownReport, Status, Operator, Shift, WorkGroup, ResolutionStatusItem, JobTicket } from '../types';
import BreakdownTable from './BreakdownTable';
import CreateReportModal from './modals/CreateReportModal';
import EditReportModal from './modals/EditReportModal';
import ManageOperatorsModal from './modals/ManageOperatorsModal';
import ManageAreaFaultsModal from './modals/ManageAreaFaultsModal';
import UnclosedShiftReportsModal from './modals/UnclosedShiftReportsModal';
import { AlertTriangle, CheckCircle2, Trash2, Edit3, ShieldAlert, Sparkles, Image as ImageIcon, Volume2, Wrench, Lock } from 'lucide-react';
import { lockoutService } from '../services/lockoutService';

interface ReporterViewProps {
  user: User;
  reports: BreakdownReport[];
  handOverReports: BreakdownReport[];
  resolutionStatuses: ResolutionStatusItem[];
  operators: Operator[];
  addOperator: (name: string, shift: Shift, workGroup?: string, employeeNumber?: string) => void;
  updateOperator: (id: string, updates: Partial<Operator>) => void;
  deleteOperator: (id: string) => void;
  addReport: (reportData: Omit<BreakdownReport, 'id' | 'reportingTime' | 'reporter' | 'status'>, employeeNumber?: string) => void;
  updateReport: (reportId: string, updates: Partial<BreakdownReport>) => void;
  duplicateReport: (reportId: string) => void;
  deleteReport: (reportId: string) => void;
  workGroups?: WorkGroup[];
  onBulkUpload?: (type: 'users' | 'artisans' | 'operators', data: any[]) => Promise<void>;
  tickets?: JobTicket[];
  hideNotifications?: boolean;
}

const ReporterView: React.FC<ReporterViewProps> = ({ 
  user, 
  reports, 
  handOverReports, 
  resolutionStatuses, 
  operators, 
  addOperator, 
  updateOperator, 
  deleteOperator, 
  addReport, 
  updateReport, 
  duplicateReport, 
  deleteReport, 
  workGroups = [], 
  onBulkUpload,
  tickets = [],
  hideNotifications = false
}) => {
  const [isCommentsModalOpen, setIsCommentsModalOpen] = useState(false);
  const [commentsReport, setCommentsReport] = useState<BreakdownReport | null>(null);
  const handleOpenComments = (report: BreakdownReport) => {
    setCommentsReport(report);
    setIsCommentsModalOpen(true);
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isManageOperatorsOpen, setIsManageOperatorsOpen] = useState(false);
  const [isManageFaultsOpen, setIsManageFaultsOpen] = useState(false);
  const [isUnclosedModalOpen, setIsUnclosedModalOpen] = useState(false);
  const [reportToEdit, setReportToEdit] = useState<BreakdownReport | null>(null);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [selectedImagePreview, setSelectedImagePreview] = useState<string | null>(null);

  // Incoming Field Report Drafts for this Reporter's WorkGroup
  const pendingDrafts = useMemo(() => {
    return reports.filter(r => 
      r.status === Status.DRAFT && 
      (!user.workGroup || user.workGroup === 'All' || r.workGroup.toLowerCase() === user.workGroup.toLowerCase())
    );
  }, [reports, user.workGroup]);

  // Incoming Lockout / Isolation Requests awaiting approval
  const pendingLockouts = useMemo(() => {
    if (!tickets) return [];
    return tickets.filter(t => {
      const st = t.status || t.state;
      return st === 'LOCKOUT_REQUESTED' && 
        (!user.workGroup || user.workGroup === 'All' || (t.workGroup && t.workGroup.toLowerCase() === user.workGroup.toLowerCase()));
    });
  }, [tickets, user.workGroup]);

  // All Area Job Cards for Reporter Dashboard
  const areaTickets = useMemo(() => {
    if (!tickets) return [];
    return tickets.filter(t => 
      (!user.workGroup || user.workGroup === 'All' || (t.workGroup && t.workGroup.toLowerCase() === user.workGroup.toLowerCase()))
    );
  }, [tickets, user.workGroup]);

  const handleApproveLockout = async (ticket: JobTicket) => {
    try {
      await lockoutService.confirmPhysicalLockout(
        ticket.id,
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

  // Detect unclosed reports from previous shift
  const unclosedReports = useMemo(() => {
    return reports.filter(r => 
      !r.resolutionTime && 
      r.status !== Status.COMPLETED &&
      r.status !== Status.DRAFT
    );
  }, [reports]);

  React.useEffect(() => {
    const today = new Date().toLocaleDateString();
    if (unclosedReports.length > 0 && localStorage.getItem('shift_reports_acknowledged_date') !== today) {
      setIsUnclosedModalOpen(true);
    }
  }, [unclosedReports]);

  const handleComplete = (report: BreakdownReport) => {
    if (window.confirm('Are you sure you want to mark this task as completed?')) {
      updateReport(report.id, { status: Status.COMPLETED, completedTime: new Date().toISOString() });
    }
  };

  const handleReportAgain = (reportId: string) => {
    if(window.confirm('Are you sure you want to report this fault again? This will create a new breakdown report.')) {
        duplicateReport(reportId);
    }
  };

  const handleEdit = (report: BreakdownReport) => {
      setReportToEdit(report);
      setIsEditModalOpen(true);
  };

  const handleApproveDraft = (draft: BreakdownReport) => {
    const changeLogEntry = {
      field: 'status',
      oldValue: Status.DRAFT,
      newValue: Status.ACTIVE,
      timestamp: new Date().toISOString(),
      changedBy: `${user.name} (Reporter Verified)`
    };
    
    updateReport(draft.id, {
      status: Status.ACTIVE,
      isDraft: false,
      changeLog: [...(draft.changeLog || []), changeLogEntry]
    });
  };

  const handleAckReport = (reportId: string) => {
    updateReport(reportId, { 
        dayshiftAcknowledged: true, 
        dayshiftAcknowledgedBy: user.name, 
        dayshiftAcknowledgedAt: new Date().toISOString() 
    });
    // Check if any reports left
    if (unclosedReports.filter(r => r.id !== reportId).length === 0) {
        localStorage.setItem('shift_reports_acknowledged_date', new Date().toLocaleDateString());
        setIsUnclosedModalOpen(false);
    }
  };

  const handleEndReport = (reportId: string) => {
    updateReport(reportId, { 
        status: Status.RESOLVED, 
        resolutionTime: new Date().toISOString(),
        resolutionNotes: 'Shift change: Report ended by reporter.'
    });
    // Check if any reports left
    if (unclosedReports.filter(r => r.id !== reportId).length === 0) {
        localStorage.setItem('shift_reports_acknowledged_date', new Date().toLocaleDateString());
        setIsUnclosedModalOpen(false);
    }
  };

  const handleRejectDraft = (draftId: string) => {
    if (window.confirm('Are you sure you want to discard this draft? It will be removed from the system.')) {
      deleteReport(draftId);
    }
  };

  const [submissionWarning, setSubmissionWarning] = useState<string | null>(null);

  const handleCreateReport = (reportData: Omit<BreakdownReport, 'id' | 'reportingTime' | 'reporter' | 'status'>, employeeNumber?: string) => {
      const now = Date.now();
      const submissions = JSON.parse(localStorage.getItem(`report_submissions_${user.id}`) || '[]') as number[];
      const recentSubmissions = submissions.filter(t => now - t < 30 * 60 * 1000);
      
      if (recentSubmissions.length >= 5) {
          setSubmissionWarning("Rate limit reached. Please wait 30 minutes before submitting more reports.");
          return;
      }
      
      if (recentSubmissions.length >= 3) {
          setSubmissionWarning(`You have submitted ${recentSubmissions.length} reports in the last 30 minutes. Limit is 5.`);
      }

      recentSubmissions.push(now);
      localStorage.setItem(`report_submissions_${user.id}`, JSON.stringify(recentSubmissions));

      addReport({
          ...reportData,
          workGroup: reportData.workGroup || user.workGroup!
      }, employeeNumber);
      setIsModalOpen(false);
  };

  const formatDraftTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '-';
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top Controls Toolbar */}
      <div className="flex justify-between items-center mb-3">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            My Reported Breakdowns
            {pendingDrafts.length > 0 && (
              <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-extrabold px-2 py-0.5 rounded-full animate-pulse">
                {pendingDrafts.length} Field Draft{pendingDrafts.length > 1 ? 's' : ''} Pending
              </span>
            )}
          </h2>
          <p className="text-[11px] text-gray-400">
            {user.workGroup ? `${user.workGroup} Area Control` : 'Process Control Reporter'}
          </p>
        </div>
        <div className="flex space-x-2">
            <button
              onClick={() => setIsManageFaultsOpen(true)}
              className="bg-indigo-900/60 hover:bg-indigo-800 text-indigo-200 border border-indigo-700/60 font-bold py-1.5 px-3 text-xs rounded-md transition duration-300 flex items-center shadow-lg cursor-pointer"
              title="Configure 1-tap quick problem description chips for this area"
            >
                <Wrench className="h-4 w-4 mr-1.5 text-indigo-400" />
              Area Faults
            </button>
            <button
              onClick={() => setIsManageOperatorsOpen(true)}
              className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-1.5 px-3 text-xs rounded-md transition duration-300 flex items-center shadow-lg cursor-pointer"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              Team
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-3 text-xs rounded-md transition duration-300 flex items-center shadow-lg cursor-pointer"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
              New Report
            </button>
        </div>
      </div>

      {/* SUBMISSION WARNING BANNER */}
      {submissionWarning && (
        <div className="mb-3 bg-amber-900/50 border border-amber-600 text-amber-200 p-3 rounded-lg flex items-center justify-between text-xs font-semibold shadow-lg">
            <span>{submissionWarning}</span>
            <button onClick={() => setSubmissionWarning(null)} className="text-amber-200 hover:text-white font-bold ml-2 underline">Dismiss</button>
        </div>
      )}

      {/* PENDING FIELD DRAFTS REVIEW BANNER */}
      {!hideNotifications && pendingDrafts.length > 0 && (
        <div className="mb-3 bg-amber-950/40 border-2 border-amber-600/60 rounded-xl p-3 shadow-xl">
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
                      {formatDraftTime(draft.reportingTime)}
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-white mt-1">
                    {draft.equipment}
                  </h4>

                  <p className="text-[11px] text-gray-300 line-clamp-2 mt-0.5 bg-gray-950/60 p-1.5 rounded border border-gray-800">
                    {draft.reportedFault}
                  </p>

                  {draft.safetyConcern && (
                    <div className="mt-1 text-[10px] font-bold text-red-400 flex items-center gap-1 bg-red-950/60 px-1.5 py-0.5 rounded border border-red-800/60">
                      <ShieldAlert className="w-3 h-3 text-red-400" />
                      Safety Concern Flagged
                    </div>
                  )}

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
                    onClick={() => handleEdit(draft)}
                    className="flex-1 py-1 px-2 text-indigo-300 hover:text-white bg-indigo-950/40 hover:bg-indigo-900/60 border border-indigo-800/50 rounded text-[10px] font-bold flex items-center justify-center gap-1 transition cursor-pointer"
                  >
                    <Edit3 className="w-3 h-3" />
                    Review & Edit
                  </button>

                  <button
                    type="button"
                    onClick={() => handleApproveDraft(draft)}
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

      {/* PENDING LOCKOUT / ISOLATION REQUESTS REVIEW BANNER */}
      {!hideNotifications && pendingLockouts.length > 0 && (
        <div className="mb-3 bg-amber-950/40 border-2 border-amber-600/60 rounded-xl p-3 shadow-xl">
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
                className="bg-gray-900/90 border border-amber-600/40 hover:border-amber-500 rounded-lg p-3 flex flex-col justify-between space-y-2 shadow-md"
              >
                <div>
                  <div className="flex justify-between items-start gap-1">
                    <span className="text-[10px] font-mono font-bold bg-amber-900/60 text-amber-200 border border-amber-700/60 px-1.5 py-0.5 rounded">
                      ID: {ticket.equipmentNumber}
                    </span>
                    <span className="text-[9px] text-gray-400">
                      {formatDraftTime(ticket.lockoutTime)}
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

                <div className="flex items-center justify-between pt-2 border-t border-gray-800 gap-1.5">
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
                    onClick={() => handleApproveLockout(ticket)}
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

      {/* AREA ACTIVE JOB CARDS & ISOLATIONS */}
      {!hideNotifications && areaTickets.length > 0 && (
        <div className="mb-4 bg-gray-900 border border-gray-800 rounded-xl p-3.5 shadow-md">
          <div className="flex items-center justify-between border-b border-gray-800 pb-2 mb-3">
            <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              Active Job Cards & Safety Isolations ({areaTickets.length})
            </h3>
            <span className="text-[10px] text-gray-400 font-mono">Area: {user.workGroup || 'All'}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
            {areaTickets.map(t => {
              const st = t.status || t.state;
              return (
                <div key={t.id} className="bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-xs space-y-1">
                  <div className="flex justify-between items-start">
                    <span className="font-mono font-bold text-amber-400 text-[11px]">{t.equipmentNumber}</span>
                    <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                      st === 'LOCKOUT_ACTIVE' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-amber-950 text-amber-300 border border-amber-800'
                    }`}>
                      {st.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="font-bold text-white text-xs">{t.equipment}</div>
                  <div className="text-[10px] text-gray-400 truncate">Scope: {t.lockoutComments}</div>
                  <div className="text-[10px] text-gray-500 flex justify-between pt-1 border-t border-gray-900">
                    <span>Req: {t.requestedByUserName}</span>
                    <span className="font-mono">{new Date(t.lockoutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Breakdown Table */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-2 pb-2">
        <BreakdownTable 
          onOpenComments={handleOpenComments} 
          reports={reports} 
          user={user} 
          onComplete={handleComplete} 
          onReportAgain={handleReportAgain}
          onEdit={handleEdit}
          onDelete={deleteReport}
          onUpdateReport={updateReport}
          resolutionStatuses={resolutionStatuses}
        />
      </div>

      <CreateReportModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateReport}
        user={user}
        workGroups={workGroups}
        operators={operators}
        addOperator={addOperator}
      />

      <EditReportModal 
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        report={reportToEdit}
        onSubmit={updateReport}
        currentUser={user}
        artisans={[]}
        resolutionStatuses={resolutionStatuses}
      />

      <ManageOperatorsModal 
        isOpen={isManageOperatorsOpen}
        onClose={() => setIsManageOperatorsOpen(false)}
        operators={operators}
        addOperator={addOperator}
        updateOperator={updateOperator}
        deleteOperator={deleteOperator}
        workGroups={workGroups}
        user={user}
        onBulkUpload={onBulkUpload}
      />
    
      <CommentsModal
        isOpen={isCommentsModalOpen}
        onClose={() => {setIsCommentsModalOpen(false); setCommentsReport(null);}}
        report={commentsReport}
        currentUser={user}
        onUpdateReport={updateReport}
      />

      <ManageAreaFaultsModal
        isOpen={isManageFaultsOpen}
        onClose={() => setIsManageFaultsOpen(false)}
        currentUser={user}
        workGroups={workGroups}
        initialArea={user.workGroup || 'GG'}
      />
      
      <UnclosedShiftReportsModal
        isOpen={isUnclosedModalOpen}
        onClose={() => {
            localStorage.setItem('shift_reports_acknowledged_date', new Date().toLocaleDateString());
            setIsUnclosedModalOpen(false);
        }}
        reports={unclosedReports}
        onAck={handleAckReport}
        onEnd={handleEndReport}
      />

      {/* Image Preview Modal */}
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

export default ReporterView;
