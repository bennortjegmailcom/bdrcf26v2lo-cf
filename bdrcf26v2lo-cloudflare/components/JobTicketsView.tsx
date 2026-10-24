import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User, BreakdownReport, JobTicket, Status, WorkGroup, LockoutState, Role } from '../types';
import { Lock, Unlock, Clock, Search, AlertTriangle, CheckCircle, Plus, X, Filter, UserCheck, Calendar, ShieldCheck, Check, ArrowRight, ShieldAlert } from 'lucide-react';
import { lockoutService } from '../services/lockoutService';

interface JobTicketsViewProps {
  user: User;
  reports: BreakdownReport[];
  tickets: JobTicket[];
  workGroups: WorkGroup[];
  initialTicketId?: string | null;
}

export const JobTicketsView: React.FC<JobTicketsViewProps> = ({ user, reports, tickets, workGroups, initialTicketId }) => {
  const CONTROL_ROOM_ROLES: string[] = [
    Role.COORDINATOR,
    Role.FOREMAN,
    Role.OPS_FOREMAN,
    Role.SCHEDULER,
    Role.ADMIN,
    Role.MECH_SUPERVISOR,
    Role.ELEC_SUPERVISOR,
    Role.TECH_SUPERVISOR,
    Role.INST_SUPERVISOR,
  ];
  const isControlRoom = CONTROL_ROOM_ROLES.includes(user.role);
  const isFieldWorker = !isControlRoom;
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Locked' | 'Returned' | 'active_workflow'>(() => {
    const saved = localStorage.getItem('ticket_status_filter');
    return (saved === 'all' || saved === 'Locked' || saved === 'Returned' || saved === 'active_workflow') ? saved : 'active_workflow';
  });
  const [userFilter, setUserFilter] = useState<'all' | 'my'>(() => {
    const saved = localStorage.getItem('ticket_user_filter');
    return (saved === 'all' || saved === 'my') ? saved : 'all';
  });
  
  // Modals state
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<JobTicket | null>(null);

  // Workflow Modal States
  const [activeModalAction, setActiveModalAction] = useState<'equipment' | 'scada' | 'physical' | 'test' | 'test_ack' | 'test_alt' | 'release_request' | 'release' | 'reject' | 'activate_lockout' | null>(null);
  const [actionComments, setActionComments] = useState('');
  const [actionEmpNumber, setActionEmpNumber] = useState(user.employeeNumber || '');
  const [testResult, setTestResult] = useState<'PASS' | 'FAIL'>('PASS');
  const [scannedQr, setScannedQr] = useState('');

  // Persist filter settings on change
  useEffect(() => {
    localStorage.setItem('ticket_status_filter', statusFilter);
  }, [statusFilter]);

  useEffect(() => {
    localStorage.setItem('ticket_user_filter', userFilter);
  }, [userFilter]);

  const handledTicketFocus = useRef<string | null>(null);

  useEffect(() => {
    if (!initialTicketId || handledTicketFocus.current === initialTicketId) return;
    handledTicketFocus.current = initialTicketId;
    setStatusFilter('all');
    setUserFilter('all');
    const timer = setTimeout(() => {
      const el = document.getElementById(`ticket-${initialTicketId}`);
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-amber-400');
      setTimeout(() => el.classList.remove('ring-2', 'ring-amber-400'), 2500);
    }, 300);
    return () => clearTimeout(timer);
  }, [initialTicketId, tickets]);

  // New ticket form state
  const [useActiveBreakdown, setUseActiveBreakdown] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState('');
  const [equipment, setEquipment] = useState('');
  const [equipmentNumber, setEquipmentNumber] = useState('');
  const [selectedWorkGroup, setSelectedWorkGroup] = useState(user.workGroup || '');
  const [workType, setWorkType] = useState('Breakdown / Unplanned Repair');
  const [bookedDuration, setBookedDuration] = useState('unspecified');
  const [lockoutComments, setLockoutComments] = useState('');
  const [empNumber, setEmpNumber] = useState(user.employeeNumber || '');

  // Return/Unlock form state
  const [unlockComments, setUnlockComments] = useState('');
  const [testSuccessful, setTestSuccessful] = useState(true);
  const [confirmTested, setConfirmTested] = useState(false);
  const [returnEmpNumber, setReturnEmpNumber] = useState(user.employeeNumber || '');

  // Live timer tick for countdowns
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const activeBreakdowns = useMemo(() => {
    return reports.filter(r => r.status === Status.ACTIVE || r.status === Status.ASSIGNED);
  }, [reports]);

  // Restore lockout draft
  useEffect(() => {
    if (isBookModalOpen) {
      const draftStr = localStorage.getItem('draft_lockout_ticket');
      if (draftStr) {
        try {
          const draft = JSON.parse(draftStr);
          setUseActiveBreakdown(draft.useActiveBreakdown || false);
          setSelectedReportId(draft.selectedReportId || '');
          setEquipment(draft.equipment || '');
          setEquipmentNumber(draft.equipmentNumber || '');
          setSelectedWorkGroup(draft.selectedWorkGroup || user.workGroup || '');
          setBookedDuration(draft.bookedDuration || 'unspecified');
          setLockoutComments(draft.lockoutComments || '');
          setEmpNumber(draft.empNumber || user.employeeNumber || '');
        } catch (e) {
          console.error("Error loading lockout draft", e);
        }
      } else {
        setUseActiveBreakdown(false);
        setSelectedReportId('');
        setEquipment('');
        setEquipmentNumber('');
        setSelectedWorkGroup(user.workGroup || '');
        setBookedDuration('unspecified');
        setLockoutComments('');
        setEmpNumber(user.employeeNumber || '');
      }
    }
  }, [isBookModalOpen, user]);

  useEffect(() => {
    if (isBookModalOpen) {
      const draft = {
        useActiveBreakdown,
        selectedReportId,
        equipment,
        equipmentNumber,
        selectedWorkGroup,
        bookedDuration,
        lockoutComments,
        empNumber
      };
      if (equipment || equipmentNumber || lockoutComments) {
        localStorage.setItem('draft_lockout_ticket', JSON.stringify(draft));
      } else {
        localStorage.removeItem('draft_lockout_ticket');
      }
    }
  }, [isBookModalOpen, useActiveBreakdown, selectedReportId, equipment, equipmentNumber, selectedWorkGroup, bookedDuration, lockoutComments, empNumber]);

  useEffect(() => {
    if (useActiveBreakdown && selectedReportId) {
      const r = reports.find(report => report.id === selectedReportId);
      if (r) {
        setEquipment(r.equipment);
        setEquipmentNumber(r.equipmentNumber);
        setSelectedWorkGroup(r.workGroup);
        if (!lockoutComments) {
          setLockoutComments(`Work isolation for reported fault: ${r.reportedFault}`);
        }
      }
    }
  }, [useActiveBreakdown, selectedReportId, reports]);

  const handleBookTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!equipment || !equipmentNumber) {
      alert('Please fill in equipment and number.');
      return;
    }

    try {
      const linkedReport = selectedReportId ? reports.find(report => report.id === selectedReportId) : undefined;
      await lockoutService.requestLockout({
        equipment,
        equipmentNumber,
        workGroup: selectedWorkGroup || user.workGroup || 'Matimba',
        workType,
        sectionId: linkedReport?.sectionId ?? null,
        sectionName: linkedReport?.sectionName || linkedReport?.handoverSection || null,
        relatedReportId: selectedReportId || undefined,
        requestedByUserId: user.id,
        requestedByUserName: user.name,
        requestedByUserEmployeeNumber: empNumber || undefined,
        bookedDurationMinutes: bookedDuration === 'unspecified' ? null : bookedDuration === 'out_of_production' ? -1 : (parseInt(bookedDuration, 10) || null),
        lockoutComments: `[Category: ${workType}] ${lockoutComments}`
      });

      setEquipment('');
      setEquipmentNumber('');
      setSelectedReportId('');
      setLockoutComments('');
      setUseActiveBreakdown(false);
      localStorage.removeItem('draft_lockout_ticket');
      setIsBookModalOpen(false);
    } catch (err) {
      console.error('Error locking out:', err);
    }
  };

  const handleReturnTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;
    if (!confirmTested) {
      alert('You must verify testing and isolation removal.');
      return;
    }

    try {
      await lockoutService.confirmLockoutRelease(
        selectedTicket.id,
        user.id,
        user.name,
        returnEmpNumber || user.employeeNumber || '',
        unlockComments || 'Unlocked and returned'
      );

      setIsReturnModalOpen(false);
      setSelectedTicket(null);
      setUnlockComments('');
      setConfirmTested(false);
    } catch (err) {
      console.error('Error unlocking ticket:', err);
    }
  };

  const handleWorkflowActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !activeModalAction) return;

    try {
      const empNum = actionEmpNumber || user.employeeNumber || '';

      if (activeModalAction === 'activate_lockout') {
        await lockoutService.confirmPhysicalLockout(selectedTicket.id, user.id, user.name, empNum, actionComments || 'Activated lockout');
      } else if (activeModalAction === 'equipment') {
        await lockoutService.confirmEquipment(selectedTicket.id, user.id, user.name, empNum, !!scannedQr);
      } else if (activeModalAction === 'scada') {
        await lockoutService.confirmScadaStop(selectedTicket.id, user.id, user.name, empNum, actionComments);
      } else if (activeModalAction === 'physical') {
        await lockoutService.confirmPhysicalLockout(selectedTicket.id, user.id, user.name, empNum, actionComments);
      } else if (activeModalAction === 'test') {
        await lockoutService.requestPositiveTest(selectedTicket.id, user.id, user.name, empNum, testResult, actionComments);
      } else if (activeModalAction === 'test_ack') {
        await lockoutService.acknowledgePositiveTest(selectedTicket.id, user.id, user.name, empNum, actionComments, 'APP', selectedTicket.positiveTestResult || testResult);
      } else if (activeModalAction === 'test_alt') {
        await lockoutService.acknowledgePositiveTest(selectedTicket.id, user.id, user.name, empNum, actionComments, 'ALTERNATIVE', testResult);
      } else if (activeModalAction === 'release_request') {
        await lockoutService.requestLockoutRelease(selectedTicket.id, user.id, user.name, empNum, actionComments);
      } else if (activeModalAction === 'release') {
        await lockoutService.confirmLockoutRelease(selectedTicket.id, user.id, user.name, empNum, actionComments);
      } else if (activeModalAction === 'reject') {
        await lockoutService.rejectLockout(selectedTicket.id, user.id, user.name, empNum, actionComments);
      }

      setActiveModalAction(null);
      setSelectedTicket(null);
      setActionComments('');
      setScannedQr('');
    } catch (err: any) {
      alert(err.message || 'Error executing workflow action');
    }
  };

  const handleDeleteTicket = async (ticketId: string) => {
    if (window.confirm('Are you sure you want to delete this job ticket log?')) {
      try {
        const cached = JSON.parse(localStorage.getItem('cache_jobTickets') || '[]');
        const updated = cached.filter((t: JobTicket) => t.id !== ticketId);
        localStorage.setItem('cache_jobTickets', JSON.stringify(updated));
      } catch (err) {
        console.error('Error deleting ticket:', err);
      }
    }
  };

  // Filtered tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      const textMatch = 
        t.equipment.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.equipmentNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.lockedByUserName && t.lockedByUserName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (t.requestedByUserName && t.requestedByUserName.toLowerCase().includes(searchTerm.toLowerCase()));
      
      if (!textMatch) return false;

      const ticketStatus = t.status || (t.state === 'RELEASED' || t.state === 'Returned' ? 'Returned' : 'Locked');

      if (statusFilter === 'Locked' && ticketStatus !== 'Locked') return false;
      if (statusFilter === 'Returned' && ticketStatus !== 'Returned') return false;
      if (statusFilter === 'active_workflow' && t.state === 'RELEASED') return false;

      if (userFilter === 'my') {
        const isMyTicket = t.lockedByUserId === user.id || t.requestedByUserId === user.id;
        if (!isMyTicket) return false;
      }

      return true;
    });
  }, [tickets, searchTerm, statusFilter, userFilter, user.id]);

  const getCountdownText = (ticket: JobTicket) => {
    if (ticket.bookedDurationMinutes === -1) {
      return {
        text: 'Out of Production',
        isOverdue: false,
        style: 'bg-indigo-900/40 text-indigo-300 border border-indigo-700/60 font-bold'
      };
    }
    if (ticket.bookedDurationMinutes === null || ticket.bookedDurationMinutes === undefined) {
      return {
        text: 'Unspecified duration',
        isOverdue: false,
        style: 'bg-yellow-900/40 text-yellow-300 border border-yellow-700/60'
      };
    }
    const lockTime = new Date(ticket.lockoutTime);
    const expiryTime = new Date(lockTime.getTime() + ticket.bookedDurationMinutes * 60 * 1000);
    const diffMs = expiryTime.getTime() - now.getTime();
    const diffMins = Math.round(diffMs / 60000);

    if (diffMins < 0) {
      return {
        text: `Overdue by ${Math.abs(diffMins)} mins`,
        isOverdue: true,
        style: 'bg-red-900/40 text-red-300 border border-red-700 animate-pulse'
      };
    } else {
      return {
        text: `${diffMins} mins remaining`,
        isOverdue: false,
        style: 'bg-green-900/40 text-green-300 border border-green-700'
      };
    }
  };

  const renderStateBadge = (ticket: JobTicket) => {
    const state = ticket.state || (ticket.status === 'Locked' ? 'LOCKOUT_ACTIVE' : 'RELEASED');
    switch (state) {
      case 'LOCKOUT_REQUESTED':
        return <span className="bg-yellow-950 text-yellow-400 border border-yellow-800 px-2.5 py-1 rounded-full text-xs font-black">REQUESTED</span>;
      case 'EQUIPMENT_CONFIRMED':
        return <span className="bg-blue-950 text-blue-400 border border-blue-800 px-2.5 py-1 rounded-full text-xs font-black">EQUIPMENT CONFIRMED</span>;
      case 'SCADA_STOP_CONFIRMED':
        return <span className="bg-purple-950 text-purple-400 border border-purple-800 px-2.5 py-1 rounded-full text-xs font-black">SCADA STOP CONFIRMED</span>;
      case 'PHYSICAL_LOCKOUT_CONFIRMED':
      case 'LOCKOUT_ACTIVE':
        return <span className="bg-red-950 text-red-400 border border-red-800 px-2.5 py-1 rounded-full text-xs font-black flex items-center gap-1"><Lock className="h-3 w-3" /> LOCKOUT ACTIVE</span>;
      case 'POSITIVE_TEST_REQUESTED':
        return <span className="bg-amber-950 text-amber-400 border border-amber-800 px-2.5 py-1 rounded-full text-xs font-black animate-pulse">POSITIVE TEST — AWAITING CONTROL ROOM</span>;
      case 'POSITIVE_TEST_ACKNOWLEDGED':
        return <span className="bg-emerald-950 text-emerald-400 border border-emerald-800 px-2.5 py-1 rounded-full text-xs font-black flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> POSITIVE TEST ACKNOWLEDGED</span>;
      case 'POSITIVE_TEST':
        return <span className="bg-emerald-950 text-emerald-400 border border-emerald-800 px-2.5 py-1 rounded-full text-xs font-black">POSITIVE TEST</span>;
      case 'RELEASE_REQUESTED':
        return <span className="bg-amber-950 text-amber-400 border border-amber-800 px-2.5 py-1 rounded-full text-xs font-black">RELEASE REQUESTED</span>;
      case 'RELEASED':
      case 'Returned':
        return <span className="bg-green-950 text-green-400 border border-green-800 px-2.5 py-1 rounded-full text-xs font-black">RELEASED / RETURNED</span>;
      case 'REJECTED':
        return <span className="bg-gray-800 text-gray-400 border border-gray-700 px-2.5 py-1 rounded-full text-xs font-black">REJECTED</span>;
      default:
        return <span className="bg-gray-800 text-gray-300 border border-gray-700 px-2.5 py-1 rounded-full text-xs font-black">{state}</span>;
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-gray-900 p-4 rounded-xl">
      <div className="shrink-0">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <Lock className="h-6 w-6 text-yellow-500" />
            WORK ISOLATION & LOCKOUT REQUESTS
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Request or activate isolation for any task that could stop production or cause downstream impact (repairs, cleaning, inspections, or operational stoppages).
          </p>
          <div className="mt-2 flex items-center gap-2 bg-red-950/30 border border-red-900/50 px-3 py-1.5 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
            <p className="text-[11px] font-bold text-red-200 uppercase tracking-tight">
              SAFETY NOTICE: Software digital confirmations do NOT replace approved physical isolation procedures. Always perform a positive test before work.
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            setEmpNumber(user.employeeNumber || '');
            setIsBookModalOpen(true);
          }}
          className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-extrabold px-5 py-2.5 rounded-lg shadow-lg transition duration-200 transform hover:scale-105"
        >
          <Plus className="h-5 w-5 stroke-[3px]" />
          REQUEST WORK ISOLATION / LOCKOUT
        </button>
      </div>

      {/* Control Filters Bar */}
      <div className="bg-gray-800/60 border border-gray-700 p-4 rounded-xl mb-6 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 shadow-sm">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </span>
          <input
            type="text"
            placeholder="Search equipment, number, or user..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-gray-900 rounded-lg p-1 border border-gray-700">
            <button
              onClick={() => setStatusFilter('active_workflow')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${statusFilter === 'active_workflow' ? 'bg-yellow-500 text-gray-950' : 'text-gray-400 hover:text-white'}`}
            >
              Active Workflows
            </button>
            <button
              onClick={() => setStatusFilter('Returned')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${statusFilter === 'Returned' ? 'bg-yellow-500 text-gray-950' : 'text-gray-400 hover:text-white'}`}
            >
              History / Released
            </button>
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${statusFilter === 'all' ? 'bg-yellow-500 text-gray-950' : 'text-gray-400 hover:text-white'}`}
            >
              All Records
            </button>
          </div>

          <div className="flex bg-gray-900 rounded-lg p-1 border border-gray-700">
            <button
              onClick={() => setUserFilter('all')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${userFilter === 'all' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              All Users
            </button>
            <button
              onClick={() => setUserFilter('my')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${userFilter === 'my' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              My Lockouts
            </button>
          </div>
        </div>
      </div>
      </div>

      {/* Main Tickets List */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-2 pb-2">
      {filteredTickets.length === 0 ? (
        <div className="bg-gray-800/40 border border-gray-800 p-16 rounded-xl text-center">
          <Unlock className="h-12 w-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-300 font-bold text-lg">No job tickets found</p>
          <p className="text-gray-500 text-sm max-w-sm mx-auto mt-1">
            There are no active lockout tickets matching your current filter criteria.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {filteredTickets.map((ticket) => {
            const countdown = ticket.status === 'Locked' || ticket.status === 'LOCKOUT_ACTIVE' ? getCountdownText(ticket) : null;
            const currentState = ticket.status || ticket.state || 'LOCKOUT_REQUESTED';
            const lockoutDate = new Date(ticket.lockoutTime).toLocaleString();

            return (
              <div 
                key={ticket.id}
                id={`ticket-${ticket.id}`}
                className="bg-gray-800 border border-gray-700 rounded-xl p-5 shadow-md flex flex-col justify-between scroll-mt-4 transition-shadow"
              >
                <div>
                  {/* Header */}
                  <div className="flex justify-between items-start gap-2 mb-3">
                    <div>
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-900 px-2 py-0.5 rounded">
                        {ticket.equipmentNumber}
                      </span>
                      <h3 className="text-lg font-extrabold text-white mt-1 leading-tight">{ticket.equipment}</h3>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      {renderStateBadge(ticket)}
                      {countdown && (
                        <span className={`text-[11px] px-2 py-0.5 rounded font-bold ${countdown.style}`}>
                          {countdown.text}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Workflow Progress Stepper Overview */}
                  <div className="bg-gray-900/80 p-3 rounded-lg border border-gray-700 mb-4 text-xs">
                    <div className="flex items-center justify-between text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                      <span>Workflow Progress</span>
                      <span className="text-yellow-400">{currentState}</span>
                    </div>
                    <div className="grid grid-cols-5 gap-1">
                      <div className={`h-1.5 rounded-full ${['LOCKOUT_REQUESTED', 'EQUIPMENT_CONFIRMED', 'SCADA_STOP_CONFIRMED', 'PHYSICAL_LOCKOUT_CONFIRMED', 'LOCKOUT_ACTIVE', 'POSITIVE_TEST', 'POSITIVE_TEST_REQUESTED', 'POSITIVE_TEST_ACKNOWLEDGED', 'RELEASE_REQUESTED', 'RELEASED'].includes(currentState) ? 'bg-yellow-500' : 'bg-gray-700'}`} title="Requested" />
                      <div className={`h-1.5 rounded-full ${['EQUIPMENT_CONFIRMED', 'SCADA_STOP_CONFIRMED', 'PHYSICAL_LOCKOUT_CONFIRMED', 'LOCKOUT_ACTIVE', 'POSITIVE_TEST', 'POSITIVE_TEST_REQUESTED', 'POSITIVE_TEST_ACKNOWLEDGED', 'RELEASE_REQUESTED', 'RELEASED'].includes(currentState) ? 'bg-blue-500' : 'bg-gray-700'}`} title="Equipment Confirmed" />
                      <div className={`h-1.5 rounded-full ${['SCADA_STOP_CONFIRMED', 'PHYSICAL_LOCKOUT_CONFIRMED', 'LOCKOUT_ACTIVE', 'POSITIVE_TEST', 'POSITIVE_TEST_REQUESTED', 'POSITIVE_TEST_ACKNOWLEDGED', 'RELEASE_REQUESTED', 'RELEASED'].includes(currentState) ? 'bg-purple-500' : 'bg-gray-700'}`} title="SCADA Stop" />
                      <div className={`h-1.5 rounded-full ${['PHYSICAL_LOCKOUT_CONFIRMED', 'LOCKOUT_ACTIVE', 'POSITIVE_TEST', 'POSITIVE_TEST_REQUESTED', 'POSITIVE_TEST_ACKNOWLEDGED', 'RELEASE_REQUESTED', 'RELEASED'].includes(currentState) ? 'bg-red-500' : 'bg-gray-700'}`} title="Physical Active" />
                      <div className={`h-1.5 rounded-full ${['RELEASED', 'Returned'].includes(currentState) ? 'bg-green-500' : 'bg-gray-700'}`} title="Released" />
                    </div>
                  </div>

                  {/* Comments / Details */}
                  <div className="bg-gray-900/60 p-3 rounded-lg border border-gray-700/50 mb-4">
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Lockout Comments:</p>
                    <p className="text-sm text-gray-200 italic">"{ticket.lockoutComments}"</p>
                    
                    {ticket.positiveTestRecord && (
                      <div className="mt-2 pt-2 border-t border-gray-800 space-y-1">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${ticket.positiveTestRecord.result === 'PASS' ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'}`}>
                          Positive Test: {ticket.positiveTestRecord.result} ({ticket.positiveTestRecord.performedByUserName})
                        </span>
                        {ticket.positiveTestAcknowledgedAt ? (
                          <p className="text-[11px] text-emerald-300">
                            Acknowledged by control room: <strong>{ticket.positiveTestAcknowledgedByUserName}</strong>
                            {' '}({ticket.positiveTestAckMethod === 'ALTERNATIVE' ? 'alternative communication' : 'app'})
                            {' '}at {new Date(ticket.positiveTestAcknowledgedAt).toLocaleTimeString()}
                            {ticket.positiveTestAcknowledgedComments ? ` — "${ticket.positiveTestAcknowledgedComments}"` : ''}
                          </p>
                        ) : ticket.status === 'POSITIVE_TEST_REQUESTED' ? (
                          <p className="text-[11px] text-amber-300 font-bold animate-pulse">
                            Submitted {ticket.positiveTestRequestedAt ? new Date(ticket.positiveTestRequestedAt).toLocaleTimeString() : ''} — awaiting control room acknowledgement
                          </p>
                        ) : null}
                      </div>
                    )}
                  </div>

                  {/* Metadata */}
                  <div className="grid grid-cols-2 gap-y-2 gap-x-4 border-t border-gray-700/50 pt-3 text-xs">
                    <div>
                      <span className="text-gray-500 font-medium block">Requested By:</span>
                      <span className="text-gray-200 font-bold flex items-center gap-1 mt-0.5">
                        <UserCheck className="h-3.5 w-3.5 text-blue-400" />
                        {ticket.requestedByUserName || ticket.lockedByUserName || 'Unknown'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 font-medium block">Lockout Time:</span>
                      <span className="text-gray-200 font-bold flex items-center gap-1 mt-0.5">
                        <Calendar className="h-3.5 w-3.5 text-blue-400" />
                        {lockoutDate}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Workflow Actions Footer */}
                <div className="mt-5 pt-3 border-t border-gray-700 flex flex-wrap justify-between items-center gap-2">
                  <div className="text-xs text-gray-400">
                    Area: <strong className="text-gray-200">{ticket.workGroup || 'Matimba'}</strong>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Action buttons based on current state */}
                    {(currentState === 'LOCKOUT_REQUESTED' || currentState === 'EQUIPMENT_CONFIRMED' || currentState === 'SCADA_STOP_CONFIRMED') && (
                      <button
                        onClick={() => { setSelectedTicket(ticket); setActiveModalAction('activate_lockout'); }}
                        className="bg-red-600 hover:bg-red-500 text-white font-extrabold px-3 py-1.5 rounded text-xs transition flex items-center gap-1 shadow-md"
                      >
                        <Lock className="h-3.5 w-3.5 stroke-[2.5]" />
                        ACTIVATE LOCKOUT
                      </button>
                    )}

                    {currentState === 'LOCKOUT_REQUESTED' && (
                      <>
                        <button
                          onClick={() => { setSelectedTicket(ticket); setActiveModalAction('equipment'); }}
                          className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-3 py-1.5 rounded text-xs transition"
                        >
                          Confirm Equipment (QR)
                        </button>
                        <button
                          onClick={() => { setSelectedTicket(ticket); setActiveModalAction('reject'); }}
                          className="bg-gray-700 hover:bg-gray-600 text-gray-300 font-bold px-3 py-1.5 rounded text-xs transition"
                        >
                          Reject
                        </button>
                      </>
                    )}

                    {currentState === 'EQUIPMENT_CONFIRMED' && (
                      <button
                        onClick={() => { setSelectedTicket(ticket); setActiveModalAction('scada'); }}
                        className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-3 py-1.5 rounded text-xs transition"
                      >
                        Confirm SCADA Stop
                      </button>
                    )}

                    {currentState === 'SCADA_STOP_CONFIRMED' && (
                      <button
                        onClick={() => { setSelectedTicket(ticket); setActiveModalAction('physical'); }}
                        className="bg-red-600 hover:bg-red-500 text-white font-bold px-3 py-1.5 rounded text-xs transition"
                      >
                        Confirm Physical Isolation
                      </button>
                    )}

                    {(currentState === 'PHYSICAL_LOCKOUT_CONFIRMED' || currentState === 'LOCKOUT_ACTIVE' || currentState === 'Locked') && (
                      <>
                        {isFieldWorker && (
                          <button
                            onClick={() => { setSelectedTicket(ticket); setTestResult('PASS'); setActiveModalAction('test'); }}
                            className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-3 py-1.5 rounded text-xs transition"
                          >
                            Submit Positive Test
                          </button>
                        )}
                        {isControlRoom && (
                          <button
                            onClick={() => { setSelectedTicket(ticket); setTestResult('PASS'); setActiveModalAction('test_alt'); }}
                            className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-3 py-1.5 rounded text-xs transition"
                          >
                            Log Positive Test (Alt Comms)
                          </button>
                        )}
                      </>
                    )}

                    {currentState === 'POSITIVE_TEST_REQUESTED' && (
                      <>
                        {isFieldWorker && (
                          <span className="bg-amber-950 text-amber-300 border border-amber-700 px-3 py-1.5 rounded text-xs font-bold animate-pulse">
                            Awaiting control room acknowledgement…
                          </span>
                        )}
                        {isControlRoom && (
                          <button
                            onClick={() => { setSelectedTicket(ticket); setActiveModalAction('test_ack'); }}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold px-3 py-1.5 rounded text-xs transition shadow-md"
                          >
                            Acknowledge Positive Test
                          </button>
                        )}
                      </>
                    )}

                    {(currentState === 'POSITIVE_TEST_ACKNOWLEDGED' || currentState === 'POSITIVE_TEST') && (
                      <>
                        <span className="bg-emerald-950 text-emerald-300 border border-emerald-700 px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1">
                          <ShieldCheck className="h-3 w-3" />
                          Test acknowledged
                        </span>
                        <button
                          onClick={() => { setSelectedTicket(ticket); setActiveModalAction('release_request'); }}
                          className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-3 py-1.5 rounded text-xs transition shadow-sm"
                        >
                          Request Release (Book Back)
                        </button>
                      </>
                    )}

                    {currentState === 'RELEASE_REQUESTED' && (
                      <button
                        onClick={() => { setSelectedTicket(ticket); setActiveModalAction('release'); }}
                        className="bg-green-600 hover:bg-green-500 text-white font-bold px-3 py-1.5 rounded text-xs transition"
                      >
                        Final Release & Return
                      </button>
                    )}

                    {/* Legacy Fallback return */}
                    {ticket.status === 'Locked' && !ticket.state && (
                      <button
                        onClick={() => {
                          setSelectedTicket(ticket);
                          setReturnEmpNumber(user.employeeNumber || '');
                          setIsReturnModalOpen(true);
                        }}
                        className="bg-green-600 hover:bg-green-500 text-white font-extrabold px-3 py-1.5 rounded text-xs transition"
                      >
                        Unlock & Return (Legacy)
                      </button>
                    )}

                    {(user.role === 'Admin' || user.role === 'Scheduler') && (
                      <button
                        onClick={() => handleDeleteTicket(ticket.id)}
                        className="text-red-400 hover:text-red-300 text-[11px] font-bold underline ml-2"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      </div>

      {/* MODAL: Book / Request Lockout */}
      {isBookModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-lg shadow-2xl">
            <div className="flex justify-between items-center border-b border-gray-700 p-4">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Lock className="h-5 w-5 text-yellow-500" />
                REQUEST WORK ISOLATION / LOCKOUT
              </h3>
              <button onClick={() => setIsBookModalOpen(false)} className="text-gray-400 hover:text-white">
                <X className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleBookTicket} className="p-5 space-y-4">
              <div className="bg-yellow-950/40 border border-yellow-800/60 p-3 rounded-lg text-xs text-yellow-200 mb-2">
                <strong>Scope of Work Isolation:</strong> Submit an isolation request for any activity that could halt production or cause downstream impact, including cleaning, inspections, repairs, or operational stoppages.
              </div>
              <div className="bg-blue-950/40 border border-blue-800/60 p-3 rounded-lg text-xs text-blue-200">
                BDR records lockout workflow information and does not replace the approved site lockout procedure.
              </div>

              {activeBreakdowns.length > 0 && (
                <div className="bg-gray-900/60 p-3 rounded-lg border border-gray-700">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useActiveBreakdown}
                      onChange={(e) => {
                        setUseActiveBreakdown(e.target.checked);
                        if (!e.target.checked) setSelectedReportId('');
                      }}
                      className="rounded bg-gray-800 border-gray-700 text-yellow-500 h-4 w-4"
                    />
                    <span className="text-sm font-bold text-gray-200">Linked to Active Breakdown Report</span>
                  </label>
                  {useActiveBreakdown && (
                    <select
                      value={selectedReportId}
                      onChange={(e) => setSelectedReportId(e.target.value)}
                      required={useActiveBreakdown}
                      className="w-full mt-2 bg-gray-800 border border-gray-700 rounded-lg p-2 text-white text-sm"
                    >
                      <option value="">-- Choose Breakdown --</option>
                      {activeBreakdowns.map(r => (
                        <option key={r.id} value={r.id}>[{r.equipmentNumber}] {r.equipment} ({r.reportedFault})</option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">Work / Stoppage Category:</label>
                <select
                  value={workType}
                  onChange={(e) => setWorkType(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-white text-sm font-semibold"
                >
                  <option value="Breakdown / Unplanned Repair">Breakdown / Unplanned Repair</option>
                  <option value="Cleaning & Washdown">Cleaning & Washdown</option>
                  <option value="Routine Inspection / Audit">Routine Inspection / Audit</option>
                  <option value="Preventative Maintenance">Preventative Maintenance</option>
                  <option value="Downstream Impact / Operational Stoppage">Downstream Impact / Operational Stoppage</option>
                  <option value="Other Production Stoppage">Other Production Stoppage</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">Equipment Name:</label>
                  <input
                    type="text"
                    required
                    disabled={useActiveBreakdown && !!selectedReportId}
                    placeholder="e.g. Conveyor 3"
                    value={equipment}
                    onChange={(e) => setEquipment(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-white text-sm disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">Equipment Number / Tag:</label>
                  <input
                    type="text"
                    required
                    disabled={useActiveBreakdown && !!selectedReportId}
                    placeholder="e.g. CV-03"
                    value={equipmentNumber}
                    onChange={(e) => setEquipmentNumber(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-white text-sm disabled:opacity-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">Work Group / Area:</label>
                <select
                  value={selectedWorkGroup}
                  onChange={(e) => setSelectedWorkGroup(e.target.value)}
                  required
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-white text-sm"
                >
                  <option value="">-- Select Work Group --</option>
                  {workGroups.map(wg => (
                    <option key={wg.id} value={wg.name}>{wg.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">Booked Duration:</label>
                <select
                  value={bookedDuration}
                  onChange={(e) => setBookedDuration(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-white text-sm"
                >
                  <option value="unspecified">Unspecified duration</option>
                  <option value="out_of_production">Out of Production</option>
                  <option value="30">30 Minutes</option>
                  <option value="60">1 Hour</option>
                  <option value="120">2 Hours</option>
                  <option value="480">8 Hours</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">Isolation Requirements & Scope:</label>
                <textarea
                  placeholder="Describe isolation requirements, cleaning scope, or inspection details..."
                  value={lockoutComments}
                  onChange={(e) => setLockoutComments(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-white text-sm h-20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">Your Employee Number:</label>
                <input
                  type="text"
                  required
                  placeholder="Employee number"
                  value={empNumber}
                  onChange={(e) => setEmpNumber(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-white text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-700">
                <button type="button" onClick={() => setIsBookModalOpen(false)} className="px-4 py-2 bg-gray-700 text-white rounded-lg text-sm font-bold">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-yellow-500 text-gray-950 rounded-lg text-sm font-black">Submit Work Isolation Request</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Workflow Action Sign-off Modal */}
      {activeModalAction && selectedTicket && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center border-b border-gray-700 p-4">
              <h3 className="text-lg font-black text-white uppercase flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-yellow-500" />
                {activeModalAction === 'activate_lockout' && 'ACTIVATE LOCKOUT (PHYSICAL ISOLATION)'}
                {activeModalAction === 'equipment' && 'Confirm Equipment & QR Tag'}
                {activeModalAction === 'scada' && 'SCADA Stop Confirmation'}
                {activeModalAction === 'physical' && 'Physical Lockout Confirmation'}
                {activeModalAction === 'test' && 'Submit Positive Test'}
                {activeModalAction === 'test_ack' && 'Acknowledge Positive Test (Control Room)'}
                {activeModalAction === 'test_alt' && 'Log Positive Test — Alternative Communication'}
                {activeModalAction === 'release_request' && 'Request Lockout Release'}
                {activeModalAction === 'release' && 'Final Release & Handback'}
                {activeModalAction === 'reject' && 'Reject Lockout Request'}
              </h3>
              <button onClick={() => setActiveModalAction(null)} className="text-gray-400 hover:text-white">
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleWorkflowActionSubmit} className="p-5 space-y-4">
              <div className="bg-gray-900 p-3 rounded-lg border border-gray-700">
                <p className="text-xs text-gray-400">Equipment:</p>
                <p className="text-sm font-black text-white">[{selectedTicket.equipmentNumber}] {selectedTicket.equipment}</p>
              </div>

              {activeModalAction === 'equipment' && (
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">Scan / Enter Equipment QR Tag:</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. QR-TAG-MCB-02"
                    value={scannedQr}
                    onChange={(e) => setScannedQr(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-white text-sm"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">Equipment identity must match the active job card or breakdown report.</p>
                </div>
              )}

              {activeModalAction === 'test' && (
                <div className="space-y-3.5 text-xs">
                  <div className="bg-amber-950/40 border border-amber-600/60 p-3 rounded-xl text-amber-200">
                    <strong className="block font-bold mb-0.5">Field Positive Test</strong>
                    Submit the positive test result. It is sent to the control room for acknowledgement before work continues.
                  </div>

                  <div className="bg-gray-900 p-3 rounded-xl border border-gray-700">
                    <div className="bg-gray-950 p-2 rounded text-amber-300 font-mono font-bold">
                      FG Tag: [{selectedTicket.equipmentNumber}] - {selectedTicket.equipment}
                    </div>
                  </div>

                  <div className="bg-gray-900 p-3 rounded-xl border border-gray-700 space-y-2">
                    <span className="font-bold text-white block">Test Result</span>
                    <div className="flex gap-3">
                      <label className={`flex-1 p-2.5 rounded-lg border cursor-pointer text-center font-bold text-xs ${testResult === 'PASS' ? 'bg-emerald-950 border-emerald-600 text-emerald-300' : 'bg-gray-950 border-gray-800 text-gray-400'}`}>
                        <input type="radio" name="test_res" checked={testResult === 'PASS'} onChange={() => setTestResult('PASS')} className="sr-only" />
                        PASS (Safe)
                      </label>
                      <label className={`flex-1 p-2.5 rounded-lg border cursor-pointer text-center font-bold text-xs ${testResult === 'FAIL' ? 'bg-rose-950 border-rose-600 text-rose-300' : 'bg-gray-950 border-gray-800 text-gray-400'}`}>
                        <input type="radio" name="test_res" checked={testResult === 'FAIL'} onChange={() => setTestResult('FAIL')} className="sr-only" />
                        FAIL (Unsafe)
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {activeModalAction === 'test_ack' && (
                <div className="space-y-3 text-xs">
                  <div className="bg-emerald-950/40 border border-emerald-600/60 p-3 rounded-xl text-emerald-200">
                    <strong className="block font-bold mb-0.5">Control Room Acknowledgement</strong>
                    Acknowledge the field worker's positive test to release the work to continue.
                  </div>
                  <div className="bg-gray-900 p-3 rounded-xl border border-gray-700 space-y-1">
                    <p className="text-gray-300">Submitted by: <strong className="text-white">{selectedTicket.positiveTestRequestedByUserName || selectedTicket.positiveTestPerformedByUserName || 'Field worker'}</strong></p>
                    <p className="text-gray-300">Result: <strong className={selectedTicket.positiveTestResult === 'FAIL' ? 'text-rose-400' : 'text-emerald-400'}>{selectedTicket.positiveTestResult || 'PASS'}</strong></p>
                    {selectedTicket.positiveTestRequestedAt && (
                      <p className="text-gray-300">Submitted at: <strong className="text-white">{new Date(selectedTicket.positiveTestRequestedAt).toLocaleString()}</strong></p>
                    )}
                    {selectedTicket.positiveTestComments && (
                      <p className="text-gray-400 italic">"{selectedTicket.positiveTestComments}"</p>
                    )}
                  </div>
                </div>
              )}

              {activeModalAction === 'test_alt' && (
                <div className="space-y-3.5 text-xs">
                  <div className="bg-amber-950/40 border border-amber-600/60 p-3 rounded-xl text-amber-200">
                    <strong className="block font-bold mb-0.5">Alternative Communication</strong>
                    The field worker reported the positive test by radio/phone. Log and acknowledge it on their behalf.
                  </div>

                  <div className="bg-gray-900 p-3 rounded-xl border border-gray-700">
                    <div className="bg-gray-950 p-2 rounded text-amber-300 font-mono font-bold">
                      FG Tag: [{selectedTicket.equipmentNumber}] - {selectedTicket.equipment}
                    </div>
                  </div>

                  <div className="bg-gray-900 p-3 rounded-xl border border-gray-700 space-y-2">
                    <span className="font-bold text-white block">Reported Result</span>
                    <div className="flex gap-3">
                      <label className={`flex-1 p-2.5 rounded-lg border cursor-pointer text-center font-bold text-xs ${testResult === 'PASS' ? 'bg-emerald-950 border-emerald-600 text-emerald-300' : 'bg-gray-950 border-gray-800 text-gray-400'}`}>
                        <input type="radio" name="test_res_alt" checked={testResult === 'PASS'} onChange={() => setTestResult('PASS')} className="sr-only" />
                        PASS (Safe)
                      </label>
                      <label className={`flex-1 p-2.5 rounded-lg border cursor-pointer text-center font-bold text-xs ${testResult === 'FAIL' ? 'bg-rose-950 border-rose-600 text-rose-300' : 'bg-gray-950 border-gray-800 text-gray-400'}`}>
                        <input type="radio" name="test_res_alt" checked={testResult === 'FAIL'} onChange={() => setTestResult('FAIL')} className="sr-only" />
                        FAIL (Unsafe)
                      </label>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">
                  {activeModalAction === 'reject' ? 'Rejection Reason (Required):' : 'Sign-off Comments / Notes:'}
                </label>
                <textarea
                  required={activeModalAction === 'reject'}
                  placeholder={activeModalAction === 'reject' ? 'State why lockout is rejected...' : 'Add confirmation notes...'}
                  value={actionComments}
                  onChange={(e) => setActionComments(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-white text-sm h-24"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">Your Employee Number:</label>
                <input
                  type="text"
                  required
                  placeholder="Employee number"
                  value={actionEmpNumber}
                  onChange={(e) => setActionEmpNumber(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-white text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-700">
                <button type="button" onClick={() => setActiveModalAction(null)} className="px-4 py-2 bg-gray-700 text-white rounded-lg text-sm font-bold">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-yellow-500 text-gray-950 rounded-lg text-sm font-black">
                  {activeModalAction === 'test' ? 'Submit to Control Room' : activeModalAction === 'test_ack' ? 'Acknowledge' : activeModalAction === 'test_alt' ? 'Log & Acknowledge' : 'Confirm Sign-off'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Legacy Return Modal */}
      {isReturnModalOpen && selectedTicket && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-lg shadow-2xl">
            <div className="flex justify-between items-center border-b border-gray-700 p-4">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Unlock className="h-5 w-5 text-green-500" />
                UNLOCK & RETURN (LEGACY)
              </h3>
              <button onClick={() => { setIsReturnModalOpen(false); setSelectedTicket(null); }} className="text-gray-400 hover:text-white">
                <X className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleReturnTicket} className="p-5 space-y-4">
              <div className="bg-gray-900 p-3 rounded-lg border border-gray-700">
                <p className="text-xs text-gray-400">Equipment: <strong className="text-white">[{selectedTicket.equipmentNumber}] {selectedTicket.equipment}</strong></p>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">Unlock Comments:</label>
                <textarea
                  value={unlockComments}
                  onChange={(e) => setUnlockComments(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-white text-sm h-20"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">Employee Number:</label>
                <input
                  type="text"
                  required
                  value={returnEmpNumber}
                  onChange={(e) => setReturnEmpNumber(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-white text-sm"
                />
              </div>
              <div className="bg-yellow-950/30 border border-yellow-800/60 p-3 rounded-lg">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmTested}
                    onChange={(e) => setConfirmTested(e.target.checked)}
                    required
                    className="rounded bg-gray-800 border-gray-700 text-green-500 h-4 w-4"
                  />
                  <span className="text-xs font-bold text-yellow-200">I verify that equipment has been tested and padlocks removed.</span>
                </label>
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-gray-700">
                <button type="button" onClick={() => { setIsReturnModalOpen(false); setSelectedTicket(null); }} className="px-4 py-2 bg-gray-700 text-white rounded-lg text-sm font-bold">Cancel</button>
                <button type="submit" disabled={!confirmTested} className="px-5 py-2 bg-green-600 text-white rounded-lg text-sm font-black disabled:opacity-40">Complete Unlock</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
