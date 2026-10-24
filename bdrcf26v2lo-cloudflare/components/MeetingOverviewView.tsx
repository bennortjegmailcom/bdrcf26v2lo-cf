import React, { useState, useEffect, useMemo, useRef } from 'react';
import html2canvas from 'html2canvas';
import { User, BreakdownReport, JobTicket, Status, WorkGroup, Role, HandoverSection } from '../types';
import { getSectionColor } from '../constants';
import EditReportModal from './modals/EditReportModal';

const isLightColor = (hex: string) => {
  const value = hex.replace('#', '');
  if (value.length !== 6) return false;
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 150;
};

const lightenColor = (hex: string, amount = 0.82) => {
  const value = hex.replace('#', '');
  if (value.length !== 6) return hex;
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  const toHex = (n: number) => Math.round(n + (255 - n) * amount).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

const stripeGradient = (color: string) => {
  const light = lightenColor(color);
  return `repeating-linear-gradient(90deg, ${color} 0px, ${color} 1.5px, ${light} 1.5px, ${light} 5px)`;
};

import { 
  Lock, 
  Unlock, 
  Clock, 
  Plus, 
  X, 
  Calendar, 
  AlertTriangle, 
  CheckCircle, 
  Activity, 
  ChevronRight, 
  HelpCircle,
  Eye,
  Settings,
  Maximize2,
  Minimize2,
  Camera,
  Download
} from 'lucide-react';

interface ToastDetail {
  title: string;
  subtitle?: string;
  durationText: string;
  details: string;
  status: string;
  type: 'breakdown' | 'lockout_active' | 'lockout_returned';
  ticket?: JobTicket;
  report?: BreakdownReport;
}

interface MeetingOverviewViewProps {
  user: User;
  reports: BreakdownReport[];
  tickets: JobTicket[];
  workGroups: WorkGroup[];
  sections?: HandoverSection[];
  addReport?: (reportData: any, employeeNumber?: string) => void;
  updateReport?: (reportId: string, updates: Partial<BreakdownReport>) => Promise<void> | void;
}

export const MeetingOverviewView: React.FC<MeetingOverviewViewProps> = ({
  user,
  reports,
  tickets,
  workGroups,
  sections = [],
  addReport,
  updateReport,
}) => {
  const [selectedArea, setSelectedArea] = useState<string>(() => {
    return localStorage.getItem('meeting_selected_area') || '';
  });
  const [shiftView, setShiftView] = useState<'24h' | 'day' | 'night'>(() => {
    const saved = localStorage.getItem('meeting_shift_view');
    return (saved === '24h' || saved === 'day' || saved === 'night') ? saved : '24h';
  });
  const [now, setNow] = useState(new Date());
  const [daysAgo, setDaysAgo] = useState<number>(0);
  const [isPopOutOpen, setIsPopOutOpen] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [activeToast, setActiveToast] = useState<ToastDetail | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  // Generate the list of the last 7 operational days (shifting at 06:00 AM)
  const last7Days = useMemo(() => {
    const list = [];
    const now = new Date();
    const base = new Date(now);
    if (base.getHours() < 6) {
      base.setDate(base.getDate() - 1);
    }
    base.setHours(6, 0, 0, 0);

    for (let i = 0; i < 7; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() - i);
      list.push({
        offset: i,
        label: i === 0 ? 'Today' : i === 1 ? 'Yesterday' : d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
        dateStr: d.toLocaleDateString()
      });
    }
    return list;
  }, []);

  const selectedDayDate = useMemo(() => {
    const now = new Date();
    const base = new Date(now);
    if (base.getHours() < 6) {
      base.setDate(base.getDate() - 1);
    }
    base.setHours(6, 0, 0, 0);
    base.setDate(base.getDate() - daysAgo);
    return base;
  }, [daysAgo]);

  // Persist preferences on change
  useEffect(() => {
    if (selectedArea) {
      localStorage.setItem('meeting_selected_area', selectedArea);
    }
  }, [selectedArea]);

  useEffect(() => {
    localStorage.setItem('meeting_shift_view', shiftView);
  }, [shiftView]);

  const selectedAreaColor = useMemo(() => {
    const match = workGroups.find(wg => wg.name === selectedArea);
    return match ? getSectionColor(match.name, match.color) : '#243447';
  }, [workGroups, selectedArea]);

  // Helper to calculate duration text
  const getDurationText = (startStr: string, endStr: string) => {
    try {
      const start = new Date(startStr);
      const end = new Date(endStr);
      const diffMs = Math.abs(end.getTime() - start.getTime());
      const totalMins = Math.round(diffMs / 60000);
      
      if (totalMins < 60) {
        return `${totalMins} mins`;
      }
      const hrs = Math.floor(totalMins / 60);
      const mins = totalMins % 60;
      return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
    } catch {
      return 'N/A';
    }
  };

  // Modal State
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<JobTicket | null>(null);

  // Form State
  const [selectedEquipmentName, setSelectedEquipmentName] = useState('');
  const [selectedEquipmentNumber, setSelectedEquipmentNumber] = useState('');
  const [bookedDuration, setBookedDuration] = useState('unspecified');
  const [lockoutComments, setLockoutComments] = useState('');
  const [empNumber, setEmpNumber] = useState(user.employeeNumber || '');
  
  // Return form state
  const [unlockComments, setUnlockComments] = useState('');
  const [testSuccessful, setTestSuccessful] = useState(true);
  const [confirmTested, setConfirmTested] = useState(false);
  const [returnEmpNumber, setReturnEmpNumber] = useState(user.employeeNumber || '');

  // Custom Booking & Add Equipment States
  const [isAddEquipmentModalOpen, setIsAddEquipmentModalOpen] = useState(false);
  const [newEquipName, setNewEquipName] = useState('');
  const [newEquipNumber, setNewEquipNumber] = useState('');
  const [bookingType, setBookingType] = useState<'breakdown' | 'lockout'>('lockout');
  const [customStartTime, setCustomStartTime] = useState(() => {
    const tzoffset = (new Date()).getTimezoneOffset() * 60000;
    return (new Date(Date.now() - tzoffset)).toISOString().slice(0, 16);
  });
  const [newFault, setNewFault] = useState('');
  const [newUrgency, setNewUrgency] = useState(2);
  const [newSectionId, setNewSectionId] = useState('');
  const [newBookedDuration, setNewBookedDuration] = useState('unspecified');
  const [newComments, setNewComments] = useState('');

  // Edit Ticket / Isolation booking States
  const [isEditTicketModalOpen, setIsEditTicketModalOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<JobTicket | null>(null);
  const [editComments, setEditComments] = useState('');
  const [editDuration, setEditDuration] = useState('unspecified');
  const [editStartTime, setEditStartTime] = useState('');
  const [editReturnTime, setEditReturnTime] = useState('');

  // States for editing Breakdown Report times
  const [isEditReportTimesModalOpen, setIsEditReportTimesModalOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<BreakdownReport | null>(null);
  const [editReportStartTime, setEditReportStartTime] = useState('');
  const [editReportEndTime, setEditReportEndTime] = useState('');

  // Auto-set the first workGroup as default selected area
  useEffect(() => {
    if (workGroups.length > 0 && !selectedArea) {
      setSelectedArea(workGroups[0].name);
    }
  }, [workGroups, selectedArea]);

  // Periodic tick
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Check roles for CRUD access (Schedulers and Reporters have CRUD, rest is read-only)
  const hasCrudAccess = useMemo(() => {
    const rolesWithAccess = [
      Role.SCHEDULER, 
      Role.REPORTER, 
      Role.ADMIN, 
      Role.FOREMAN, 
      Role.OPS_FOREMAN,
      Role.MECH_SUPERVISOR,
      Role.ELEC_SUPERVISOR,
      Role.TECH_SUPERVISOR,
      Role.INST_SUPERVISOR,
      Role.COORDINATOR
    ];
    return rolesWithAccess.includes(user.role);
  }, [user.role]);

  // Determine the start and end of our timeline view
  const { timelineStart, timelineEnd, hourTicks } = useMemo(() => {
    const baseDate = new Date(selectedDayDate);
    // Standard production day starts at 06:00 AM
    const start = new Date(baseDate);
    start.setMinutes(0);
    start.setSeconds(0);
    start.setMilliseconds(0);

    let durationHours = 24;

    if (shiftView === '24h') {
      start.setHours(6);
      durationHours = 24;
    } else if (shiftView === 'day') {
      start.setHours(6);
      durationHours = 12;
    } else {
      start.setHours(18);
      durationHours = 12;
    }

    const end = new Date(start.getTime() + durationHours * 60 * 60 * 1000);

    const ticks: Date[] = [];
    for (let i = 0; i <= durationHours; i++) {
      ticks.push(new Date(start.getTime() + i * 60 * 60 * 1000));
    }

    return {
      timelineStart: start,
      timelineEnd: end,
      hourTicks: ticks
    };
  }, [shiftView, selectedDayDate]);

  // Gather unique equipment lists in the selected Area that have active/historical bookings overlapping the selected time window
  const areaEquipment = useMemo(() => {
    const area = selectedArea || (workGroups.length > 0 ? workGroups[0].name : '');
    if (!area) return [];

    const equipmentMap = new Map<string, { name: string; number: string }>();

    // Helper to check if a breakdown overlaps with selected timeline
    const breakdownOverlaps = (r: BreakdownReport) => {
      const startTime = new Date(r.reportingTime);
      let endTime = daysAgo === 0 ? now : timelineEnd;
      if (r.status === Status.COMPLETED && r.completedTime) {
        endTime = new Date(r.completedTime);
      } else if (r.status === Status.RESOLVED && r.resolutionTime) {
        endTime = new Date(r.resolutionTime);
      }
      return startTime < timelineEnd && endTime > timelineStart;
    };

    // Helper to check if a ticket overlaps with selected timeline
    const ticketOverlaps = (t: JobTicket) => {
      const startTime = new Date(t.lockoutTime);
      let endTime: Date;
      if (t.status === 'Returned' && t.unlockTime) {
        endTime = new Date(t.unlockTime);
      } else if (t.bookedDurationMinutes === null || t.bookedDurationMinutes === undefined) {
        endTime = daysAgo === 0 ? now : timelineEnd;
      } else {
        endTime = new Date(startTime.getTime() + t.bookedDurationMinutes * 60 * 1000);
      }
      return startTime < timelineEnd && endTime > timelineStart;
    };

    // 1. From Breakdown reports
    reports.forEach(r => {
      if (r.workGroup === area && breakdownOverlaps(r)) {
        const key = `${r.equipmentNumber}-${r.equipment}`.toLowerCase();
        equipmentMap.set(key, { name: r.equipment, number: r.equipmentNumber });
      }
    });

    // 2. From Job tickets
    tickets.forEach(t => {
      if (t.workGroup === area && ticketOverlaps(t)) {
        const key = `${t.equipmentNumber}-${t.equipment}`.toLowerCase();
        equipmentMap.set(key, { name: t.equipment, number: t.equipmentNumber });
      }
    });

    const isEqOutOfProduction = (name: string, num: string) => {
      return tickets.some(t => 
        t.equipment.toLowerCase() === name.toLowerCase() && 
        t.equipmentNumber.toLowerCase() === num.toLowerCase() && 
        t.status === 'Locked' && 
        t.bookedDurationMinutes === -1
      );
    };

    const sortedList = Array.from(equipmentMap.values());
    sortedList.sort((a, b) => {
      const aOut = isEqOutOfProduction(a.name, a.number);
      const bOut = isEqOutOfProduction(b.name, b.number);
      if (aOut && !bOut) return 1; // Put out of production at the bottom
      if (!aOut && bOut) return -1;
      return a.name.localeCompare(b.name); // Keep alphabetical order otherwise
    });
    return sortedList;
  }, [selectedArea, workGroups, reports, tickets, timelineStart, timelineEnd, now, daysAgo]);

  // Filter relevant events for the selected Area/WorkGroup
  const { areaReports, areaTickets } = useMemo(() => {
    const area = selectedArea || (workGroups.length > 0 ? workGroups[0].name : '');
    const filteredReports = reports.filter(r => r.workGroup === area);
    const filteredTickets = tickets.filter(t => t.workGroup === area);
    return { areaReports: filteredReports, areaTickets: filteredTickets };
  }, [selectedArea, workGroups, reports, tickets]);

  // Helper to map timestamp to horizontal percentage
  const getPct = (timeStr: string) => {
    const time = new Date(timeStr);
    const totalMs = timelineEnd.getTime() - timelineStart.getTime();
    const diffMs = time.getTime() - timelineStart.getTime();
    return (diffMs / totalMs) * 100;
  };

  const resolveSectionColor = (sectionId?: string | null, ...sectionNames: (string | null | undefined)[]) => {
    const byId = sectionId ? sections.find(s => s.id === sectionId) : undefined;
    const byName = byId || sections.find(s => sectionNames.some(name => name && s.name === name));
    return byName ? getSectionColor(byName.name, byName.color) : undefined;
  };

  const getReportSectionColor = (report: BreakdownReport) =>
    resolveSectionColor(report.sectionId, report.sectionName, report.handoverSection);

  const getTicketSectionColor = (ticket: JobTicket) => {
    const direct = resolveSectionColor(ticket.sectionId, ticket.sectionName);
    if (direct) return direct;
    const linkedReport = ticket.relatedReportId ? reports.find(r => r.id === ticket.relatedReportId) : undefined;
    return linkedReport ? getReportSectionColor(linkedReport) : undefined;
  };

  // Helper to render timeline segments for a given equipment
  const renderTimelineSegments = (eqName: string, eqNum: string) => {
    const segments: React.ReactNode[] = [];

    // Find reports for this equipment
    const eqReports = areaReports.filter(
      r => r.equipment.toLowerCase() === eqName.toLowerCase() && 
           r.equipmentNumber.toLowerCase() === eqNum.toLowerCase()
    );

    // Find tickets for this equipment
    const eqTickets = areaTickets.filter(
      t => t.equipment.toLowerCase() === eqName.toLowerCase() && 
           t.equipmentNumber.toLowerCase() === eqNum.toLowerCase()
    );

    // 1. Plot Breakdown Reports (Downtime)
    eqReports.forEach(report => {
      const startTime = new Date(report.reportingTime);
      
      // End time is completion time, resolution time, or NOW if active
      let endTime = daysAgo === 0 ? now : timelineEnd;
      if (report.status === Status.COMPLETED && report.completedTime) {
        endTime = new Date(report.completedTime);
      } else if (report.resolutionTime) {
        endTime = new Date(report.resolutionTime);
      }

      // Check if overlaps with current timeline range
      if (startTime < timelineEnd && endTime > timelineStart) {
        const leftPct = Math.max(0, getPct(startTime.toISOString()));
        const rightPct = Math.min(100, getPct(endTime.toISOString()));
        const widthPct = rightPct - leftPct;

        if (widthPct > 0.3) {
          const durText = getDurationText(report.reportingTime, endTime.toISOString());
          const sectionColor = getReportSectionColor(report);
          const sectionName = report.sectionName || report.handoverSection;
          segments.push(
            <div
              key={`rep-${report.id}`}
              onClick={(e) => {
                e.stopPropagation();
                setActiveToast({
                  title: `Breakdown: ${report.equipment}`,
                  subtitle: `Tag ID: ${report.equipmentNumber} • Area: ${report.workGroup}`,
                  durationText: durText,
                  details: `Reported Fault: ${report.reportedFault || 'N/A'}\n\nStatus: ${report.status}\nReported By: ${report.reporter?.name || 'N/A'}\nTime: ${new Date(report.reportingTime).toLocaleTimeString()}`,
                  status: report.status,
                  type: 'breakdown',
                  report: report
                });
              }}
              className="absolute inset-y-0 cursor-pointer shadow-sm transition-all hover:opacity-90 z-10 border-x flex items-center justify-center overflow-hidden"
              style={{
                left: `${leftPct}%`,
                width: `${widthPct}%`,
                borderColor: sectionColor || '#e11d48',
                backgroundImage: sectionColor
                  ? stripeGradient(sectionColor)
                  : 'repeating-linear-gradient(90deg, #f43f5e 0px, #f43f5e 1.5px, #ffe4e6 1.5px, #ffe4e6 5px)',
                backgroundColor: sectionColor ? lightenColor(sectionColor) : '#ffe4e6'
              }}
              title={`[Breakdown] ${report.reportedFault}${sectionName ? `\nSection: ${sectionName}` : ''}\nReported: ${startTime.toLocaleTimeString()}\nTotal Duration: ${durText}\nStatus: ${report.status}`}
            >
              {widthPct > 3 && (
                <span
                  className={`text-[9px] font-extrabold px-1 rounded truncate max-w-[90%] shadow-sm ${sectionColor ? '' : 'bg-rose-900/85 text-white'}`}
                  style={sectionColor ? { backgroundColor: sectionColor, color: isLightColor(sectionColor) ? '#111827' : '#ffffff' } : undefined}
                >
                  {report.reportedFault}
                </span>
              )}
            </div>
          );
        }
      }
    });

    // 2. Plot Job Tickets (Lockouts / Booked isolates)
    eqTickets.forEach(ticket => {
      const startTime = new Date(ticket.lockoutTime);
      
      let endTime: Date;
      if (ticket.status === 'Returned' && ticket.unlockTime) {
        endTime = new Date(ticket.unlockTime);
      } else if (ticket.bookedDurationMinutes === null || ticket.bookedDurationMinutes === undefined) {
        endTime = daysAgo === 0 ? now : timelineEnd;
      } else {
        endTime = new Date(startTime.getTime() + ticket.bookedDurationMinutes * 60 * 1000);
      }

      if (startTime < timelineEnd && endTime > timelineStart) {
        const leftPct = Math.max(0, getPct(startTime.toISOString()));
        const rightPct = Math.min(100, getPct(endTime.toISOString()));
        const widthPct = rightPct - leftPct;

        if (widthPct > 0.3) {
          const isLocked = ticket.status === 'Locked';
          const durText = getDurationText(ticket.lockoutTime, endTime.toISOString());
          const sectionColor = getTicketSectionColor(ticket);
          const linkedReport = ticket.relatedReportId ? reports.find(r => r.id === ticket.relatedReportId) : undefined;
          const sectionName = ticket.sectionName || linkedReport?.sectionName || linkedReport?.handoverSection;

          segments.push(
            <div
              key={`tkt-${ticket.id}`}
              onClick={(e) => {
                e.stopPropagation();
                setActiveToast({
                  title: `Isolation Lockout: ${ticket.equipment}`,
                  subtitle: `Tag ID: ${ticket.equipmentNumber} • Area: ${ticket.workGroup || 'N/A'}`,
                  durationText: durText,
                  details: `Isolation padlock info / work scope:\n${ticket.lockoutComments || '(No Comments Specified)'}\n\nLocked By: ${ticket.lockedByUserName} ${ticket.lockedByUserEmployeeNumber ? `(Emp #${ticket.lockedByUserEmployeeNumber})` : ''}\nLockout Time: ${new Date(ticket.lockoutTime).toLocaleTimeString()}${ticket.status === 'Returned' ? `\n\nReturned By: ${ticket.returnedByUserName || 'N/A'}\nTest Outcome: ${ticket.testSuccessful ? 'Tested & Successfully OK ✅' : 'Test Failed ❌'}\nUnlock comments: ${ticket.unlockComments || 'No comments'}` : ''}`,
                  status: ticket.status,
                  type: isLocked ? 'lockout_active' : 'lockout_returned',
                  ticket: ticket
                });
              }}
              className={`absolute inset-y-0 cursor-pointer shadow-sm transition-all hover:opacity-90 z-20 flex items-center justify-center overflow-hidden border-x ${
                sectionColor ? '' : isLocked ? 'border-amber-500' : 'border-emerald-600'
              }`}
              style={{
                left: `${leftPct}%`,
                width: `${widthPct}%`,
                borderColor: sectionColor || undefined,
                backgroundImage: sectionColor
                  ? stripeGradient(sectionColor)
                  : isLocked 
                    ? 'repeating-linear-gradient(90deg, #d97706 0px, #d97706 1.5px, #fef3c7 1.5px, #fef3c7 5px)'
                    : 'repeating-linear-gradient(90deg, #059669 0px, #059669 1.5px, #d1fae5 1.5px, #d1fae5 5px)',
                backgroundColor: sectionColor ? lightenColor(sectionColor) : isLocked ? '#fef3c7' : '#d1fae5'
              }}
              title={`[${ticket.status}] Padlock Isolation${sectionName ? `\nSection: ${sectionName}` : ''}\nLocked By: ${ticket.lockedByUserName}\nTotal Duration: ${durText}\nComments: ${ticket.lockoutComments || '(None)'}`}
            >
              {isLocked ? (
                <div
                  className={`font-black text-[9px] px-1 py-0.5 rounded flex items-center gap-0.5 truncate max-w-[90%] shadow-sm ${sectionColor ? '' : 'bg-amber-900/90 text-white'}`}
                  style={sectionColor ? { backgroundColor: sectionColor, color: isLightColor(sectionColor) ? '#111827' : '#ffffff' } : undefined}
                >
                  <Lock className="h-2.5 w-2.5 shrink-0" />
                  <span className="truncate">{ticket.lockedByUserName}</span>
                </div>
              ) : (
                <div
                  className={`font-black text-[9px] px-1 py-0.5 rounded flex items-center gap-0.5 truncate max-w-[90%] shadow-sm ${sectionColor ? '' : 'bg-emerald-900/90 text-white'}`}
                  style={sectionColor ? { backgroundColor: sectionColor, color: isLightColor(sectionColor) ? '#111827' : '#ffffff' } : undefined}
                >
                  <Unlock className="h-2.5 w-2.5 shrink-0" />
                  <span className="truncate">OK</span>
                </div>
              )}
            </div>
          );
        }
      }
    });

    return segments;
  };

  // Create Lockout action handler
  const handleBookLockoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEquipmentName || !selectedEquipmentNumber) return;

    try {
      const id = `ticket-${Date.now()}`;
      const newTicket: JobTicket = {
        id,
        equipment: selectedEquipmentName,
        equipmentNumber: selectedEquipmentNumber,
        lockedByUserId: user.id,
        lockedByUserName: user.name,
        lockedByUserEmployeeNumber: empNumber || null,
        lockoutTime: new Date().toISOString(),
        bookedDurationMinutes: bookedDuration === 'unspecified' ? null : bookedDuration === 'out_of_production' ? -1 : (parseInt(bookedDuration, 10) || null),
        lockoutComments,
        status: 'Locked',
        workGroup: selectedArea
      };
      const cached = JSON.parse(localStorage.getItem('cache_jobTickets') || '[]');
      cached.unshift(newTicket);
      localStorage.setItem('cache_jobTickets', JSON.stringify(cached));
      window.dispatchEvent(new Event('storage'));

      // Reset
      setIsBookModalOpen(false);
      setSelectedEquipmentName('');
      setSelectedEquipmentNumber('');
      setLockoutComments('');
    } catch (err) {
      console.error('Error booking ticket from timeline:', err);
    }
  };

  // Return / Unlock Action Handler
  const handleReturnTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;
    if (!confirmTested) {
      alert('You must confirm removal of the lockouts & test run outcome.');
      return;
    }

    try {
      const cached = JSON.parse(localStorage.getItem('cache_jobTickets') || '[]');
      const updated = cached.map((t: JobTicket) => t.id === selectedTicket.id ? {
        ...t,
        status: 'Returned',
        unlockTime: new Date().toISOString(),
        testSuccessful,
        unlockComments,
        returnedByUserId: user.id,
        returnedByUserName: user.name,
        returnedByUserEmployeeNumber: returnEmpNumber || null
      } : t);
      localStorage.setItem('cache_jobTickets', JSON.stringify(updated));
      window.dispatchEvent(new Event('storage'));

      setIsReturnModalOpen(false);
      setSelectedTicket(null);
      setUnlockComments('');
      setConfirmTested(false);
    } catch (err) {
      console.error('Error returning ticket from timeline:', err);
    }
  };

  const handleAddEquipmentBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEquipName || !newEquipNumber) {
      alert("Please specify both Equipment Name and Tag ID.");
      return;
    }

    try {
      const startTimeISO = new Date(customStartTime).toISOString();

      if (bookingType === 'breakdown') {
        if (addReport) {
          const sectionName = sections.find(s => s.id === newSectionId)?.name || '';
          await addReport({
            equipment: newEquipName,
            equipmentNumber: newEquipNumber,
            reportedFault: newFault || 'Downtime Schedule',
            workGroup: selectedArea,
            urgency: newUrgency,
            sectionId: newSectionId || null,
            sectionName: sectionName || null,
            reportingTime: startTimeISO,
          }, user.employeeNumber);
        } else {
          // Fallback if addReport is not passed directly
          const id = `rep-${Date.now()}`;
          const newRep = {
            id,
            equipment: newEquipName,
            equipmentNumber: newEquipNumber,
            reportedFault: newFault || 'Downtime Schedule',
            workGroup: selectedArea,
            urgency: newUrgency,
            sectionId: newSectionId || null,
            sectionName: sections.find(s => s.id === newSectionId)?.name || null,
            reportingTime: startTimeISO,
            reporter: {
              id: user.id,
              name: user.name,
              role: user.role,
              shift: user.shift || 'A',
              employeeNumber: user.employeeNumber || null
            },
            status: Status.ACTIVE,
            changeLog: []
          };
          const cached = JSON.parse(localStorage.getItem('cache_reports') || '[]');
          cached.unshift(newRep);
          localStorage.setItem('cache_reports', JSON.stringify(cached));
          window.dispatchEvent(new Event('storage'));
        }
      } else {
        // Create lockout (JobTicket)
        const id = `ticket-${Date.now()}`;
        const sectionName = sections.find(s => s.id === newSectionId)?.name || null;
        const newTicket: JobTicket = {
          id,
          equipment: newEquipName,
          equipmentNumber: newEquipNumber,
          sectionId: newSectionId || null,
          sectionName,
          lockedByUserId: user.id,
          lockedByUserName: user.name,
          lockedByUserEmployeeNumber: user.employeeNumber || null,
          lockoutTime: startTimeISO,
          bookedDurationMinutes: newBookedDuration === 'unspecified' ? null : newBookedDuration === 'out_of_production' ? -1 : (parseInt(newBookedDuration, 10) || null),
          lockoutComments: newComments || 'Scheduled Isolation Lockout',
          status: 'Locked',
          workGroup: selectedArea
        };
        const cached = JSON.parse(localStorage.getItem('cache_jobTickets') || '[]');
        cached.unshift(newTicket);
        localStorage.setItem('cache_jobTickets', JSON.stringify(cached));
        window.dispatchEvent(new Event('storage'));
      }

      // Reset
      setIsAddEquipmentModalOpen(false);
      setNewEquipName('');
      setNewEquipNumber('');
      setNewFault('');
      setNewComments('');
      setNewBookedDuration('unspecified');
    } catch (err) {
      console.error('Error adding equipment and custom booking:', err);
    }
  };

  const handleEditTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTicket) return;

    try {
      const updates: any = {
        lockoutComments: editComments,
        bookedDurationMinutes: editDuration === 'unspecified' ? null : editDuration === 'out_of_production' ? -1 : (parseInt(editDuration, 10) || null),
        lockoutTime: new Date(editStartTime).toISOString()
      };
      if (editReturnTime) {
        updates.unlockTime = new Date(editReturnTime).toISOString();
      }
      const cached = JSON.parse(localStorage.getItem('cache_jobTickets') || '[]');
      const updated = cached.map((t: JobTicket) => t.id === editingTicket.id ? { ...t, ...updates } : t);
      localStorage.setItem('cache_jobTickets', JSON.stringify(updated));
      window.dispatchEvent(new Event('storage'));
      setIsEditTicketModalOpen(false);
      setEditingTicket(null);
    } catch (err) {
      console.error("Error updating ticket:", err);
    }
  };
  
  const handleEditReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReport) return;

    try {
      const updates: any = {
        reportingTime: new Date(editReportStartTime).toISOString()
      };
      
      if (editReportEndTime) {
        if (editingReport.status === Status.COMPLETED) {
          updates.completedTime = new Date(editReportEndTime).toISOString();
        } else {
          updates.resolutionTime = new Date(editReportEndTime).toISOString();
        }
      }
      
      if (updateReport) {
        await updateReport(editingReport.id, updates);
      } else {
        const cached = JSON.parse(localStorage.getItem('cache_reports') || '[]');
        const updated = cached.map((r: BreakdownReport) => r.id === editingReport.id ? { ...r, ...updates } : r);
        localStorage.setItem('cache_reports', JSON.stringify(updated));
        window.dispatchEvent(new Event('storage'));
      }
      setIsEditReportTimesModalOpen(false);
      setEditingReport(null);
    } catch (err) {
      console.error("Error updating report times:", err);
    }
  };

  const handleExportScreenshot = async () => {
    if (!timelineRef.current) return;
    setIsCapturing(true);

    const targetEl = timelineRef.current;
    
    // Find all internal scroll containers
    const scrollContainers = targetEl.querySelectorAll<HTMLElement>('.overflow-auto, .overflow-x-auto, .overflow-y-auto');
    const originalStyles: Array<{ el: HTMLElement; maxH: string; overflow: string; height: string }> = [];

    // Temporarily expand scroll constraints to capture the entire table (all equipment rows & full 24h width)
    scrollContainers.forEach(el => {
      originalStyles.push({
        el,
        maxH: el.style.maxHeight,
        overflow: el.style.overflow,
        height: el.style.height
      });
      el.style.maxHeight = 'none';
      el.style.overflow = 'visible';
      el.style.height = 'auto';
    });

    try {
      // Allow DOM to re-layout
      await new Promise(resolve => setTimeout(resolve, 150));

      const fullWidth = Math.max(targetEl.scrollWidth, targetEl.offsetWidth, 1300);
      const fullHeight = Math.max(targetEl.scrollHeight, targetEl.offsetHeight);

      const canvas = await html2canvas(targetEl, {
        backgroundColor: '#ffffff',
        scale: 2, // High resolution crisp text and graphics
        logging: false,
        useCORS: true,
        width: fullWidth,
        height: fullHeight,
        windowWidth: fullWidth + 100,
        windowHeight: fullHeight + 100,
        scrollX: 0,
        scrollY: 0
      });

      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `equipment-utilization-report-${(selectedArea || 'plant').replace(/\s+/g, '_')}-${new Date().toISOString().split('T')[0]}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Error generating full report screenshot:', err);
      alert('Failed to generate screenshot.');
    } finally {
      // Restore original scroll and size styles
      originalStyles.forEach(({ el, maxH, overflow, height }) => {
        el.style.maxHeight = maxH;
        el.style.overflow = overflow;
        el.style.height = height;
      });
      setIsCapturing(false);
    }
  };

  const renderTimelineGridBody = () => {
    if (areaEquipment.length === 0) {
      return (
        <div className="bg-slate-50 border border-slate-300 p-16 rounded-lg text-center">
          <Settings className="h-12 w-12 text-slate-400 mx-auto mb-3 stroke-[1.5]" />
          <p className="text-slate-800 font-extrabold text-lg">No equipment found for {selectedArea}</p>
          <p className="text-slate-500 text-sm max-w-sm mx-auto mt-1">
            Report a breakdown or book a job lockout ticket in the {selectedArea} area to list it on this timeline.
          </p>
        </div>
      );
    }

    const totalHours = hourTicks.length - 1;

    return (
      <div className="overflow-auto max-h-[calc(100vh-240px)] min-h-[450px] custom-scrollbar border border-slate-300 rounded-lg bg-white shadow-sm relative">
        <div className="min-w-[1250px] flex flex-col divide-y divide-slate-300">
          {areaEquipment.map((eq, rIndex) => (
            <div key={rIndex} className="flex flex-row">
              {/* Equipment Left Column: Sticky on horizontal scroll, compact padding, grey background, bold black text */}
              <div
                className="w-56 md:w-64 shrink-0 bg-[#EAEEF3] py-2 px-3 flex flex-col justify-center border-r border-slate-300 sticky left-0 z-20 shadow-sm"
                style={{ borderLeft: `3px solid ${selectedAreaColor}` }}
              >
                <span className="font-bold text-slate-900 text-xs md:text-sm leading-tight">{eq.name}</span>
                <span className="text-[10px] font-semibold text-slate-500 mt-0.5">{eq.number}</span>
                
                {hasCrudAccess && (
                  <button
                    onClick={() => {
                      setSelectedEquipmentName(eq.name);
                      setSelectedEquipmentNumber(eq.number);
                      setIsBookModalOpen(true);
                    }}
                    className="text-[9px] text-amber-700 hover:text-amber-900 font-extrabold flex items-center gap-0.5 mt-1 transition-colors"
                  >
                    <Plus className="h-2.5 w-2.5 stroke-[3px]" /> Book Lockout
                  </button>
                )}
              </div>

              {/* Right Column: Shift Header + Hour Ticks + Timeline Track */}
              <div className="flex-1 flex flex-col bg-white">
                {/* 1. Shift Banner Header matching image */}
                <div
                  className="flex text-[11px] font-bold h-6 items-center select-none border-b border-slate-400"
                  style={{ backgroundColor: selectedAreaColor, color: isLightColor(selectedAreaColor) ? '#0f172a' : '#ffffff' }}
                >
                  {shiftView === '24h' ? (
                    <>
                      <div className="w-1/2 text-center border-r border-slate-600 py-0.5">
                        Day Shift (6:00-18:00)
                      </div>
                      <div className="w-1/2 text-center py-0.5">
                        Night Shift (18:00-6:00)
                      </div>
                    </>
                  ) : shiftView === 'day' ? (
                    <div className="w-full text-center py-0.5">
                      Day Shift (6:00-18:00)
                    </div>
                  ) : (
                    <div className="w-full text-center py-0.5">
                      Night Shift (18:00-6:00)
                    </div>
                  )}
                </div>

                {/* 2. Hour Ticks Header Row matching vertical text in image */}
                <div className="flex h-7 bg-white border-b border-slate-300 relative select-none">
                  {hourTicks.slice(0, totalHours).map((tick, index) => {
                    const displayHour = tick.getHours().toString().padStart(2, '0') + ':00';
                    return (
                      <div
                        key={index}
                        className="flex-1 border-r border-slate-300 flex items-center justify-center text-[9px] font-mono text-slate-700 font-bold"
                      >
                        <span className="tracking-tighter">
                          {displayHour}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* 3. Timeline Track Grid with crisp vertical guidelines and event blocks */}
                <div className="relative h-9 bg-white">
                  {/* Vertical Hour Guidelines */}
                  <div className="absolute inset-0 flex pointer-events-none">
                    {hourTicks.slice(0, totalHours).map((_, i) => (
                      <div key={i} className="flex-1 border-r border-slate-300 relative">
                        {/* Half-hour subtle dash */}
                        <div className="absolute left-1/2 top-0 bottom-0 w-[1px] border-r border-dashed border-slate-200"></div>
                      </div>
                    ))}
                  </div>

                  {/* Render Event Segments (Breakdown striped, Lockout striped) */}
                  <div className="absolute inset-0 z-5">
                    {renderTimelineSegments(eq.name, eq.number)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Full Report Container Captured by Export */}
      <div
        ref={timelineRef}
        className="space-y-3 bg-slate-50 p-2 sm:p-4 rounded-xl border border-slate-200"
        style={{ borderTop: `4px solid ${selectedAreaColor}` }}
      >
        
        {/* 1. Dark Top Header Bar matching reference image */}
        <div className="bg-[#243447] text-white rounded-lg p-3 md:p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
          {/* Space placeholder to center title against right actions on desktop */}
          <div className="hidden md:block w-48 shrink-0" />

          {/* Center Title */}
          <div className="text-center">
            <h1 className="text-xl md:text-2xl font-bold tracking-wide text-white">
              Meeting view
            </h1>
            <p className="text-[11px] text-slate-300 font-medium">
              Plant Area: <span className="text-white font-bold inline-flex items-center gap-1.5 align-middle"><span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: selectedAreaColor }} />{selectedArea || 'All Plant Sections'}</span> • View: <span className="text-white font-bold">{shiftView === '24h' ? '24 Hour Production Day' : shiftView === 'day' ? 'Day Shift (6:00-18:00)' : 'Night Shift (18:00-6:00)'}</span> • Export Date: <span className="text-white font-bold">{selectedDayDate.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</span>
            </p>
            <p className="text-[10px] text-amber-400 font-extrabold mt-1 uppercase tracking-tighter opacity-90">
              Note: these downtimes are determined by bookings on this app. For true down times, please refer to the Eu report.
            </p>
          </div>

          {/* Right Actions (Ignored by html2canvas during export capture) */}
          <div className="flex items-center gap-2" data-html2canvas-ignore="true">
            {!hasCrudAccess && (
              <div className="flex items-center gap-1.5 bg-[#33475B] px-3 py-1.5 rounded text-xs text-blue-300 font-bold">
                <Eye className="h-3.5 w-3.5" /> READ-ONLY
              </div>
            )}
            <button
              onClick={() => setIsPopOutOpen(true)}
              className="flex items-center gap-1.5 bg-[#33475B] hover:bg-[#3d556d] text-white text-xs font-bold px-3 py-1.5 rounded transition"
              title="Pop out into full screen presentation view"
            >
              <Maximize2 className="h-3.5 w-3.5" /> Pop Out
            </button>
            <button
              onClick={handleExportScreenshot}
              disabled={isCapturing}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold px-3 py-1.5 rounded transition shadow-sm"
            >
              {isCapturing ? <Clock className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              {isCapturing ? 'Capturing Full Report...' : 'Export Full Report'}
            </button>
          </div>
        </div>

        {/* 2. Controls & Filter Bar */}
        <div className="bg-slate-100 border border-slate-300 p-3 rounded-lg flex flex-col gap-3.5">
          {/* Top Row: Plant Area & Shift View Selection */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            {/* Plant Area Selector */}
            <div className="flex-1 min-w-0">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Select Plant Area:
              </label>
              <div className="flex flex-wrap items-center gap-1.5">
                {workGroups.map(wg => {
                  const sectionColor = getSectionColor(wg.name, wg.color);
                  const isSelected = selectedArea === wg.name;
                  return (
                    <button
                      key={wg.id}
                      onClick={() => setSelectedArea(wg.name)}
                      className={`px-3 py-1 rounded text-xs font-bold transition-all border-2 shadow-sm ${isSelected ? '' : 'hover:brightness-95'}`}
                      style={
                        isSelected
                          ? { backgroundColor: sectionColor, borderColor: sectionColor, color: isLightColor(sectionColor) ? '#0f172a' : '#ffffff' }
                          : { backgroundColor: '#ffffff', borderColor: sectionColor, color: sectionColor }
                      }
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: isSelected ? (isLightColor(sectionColor) ? '#0f172a' : '#ffffff') : sectionColor }}
                        />
                        {wg.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right Controls: View Selector + Add Booking Trigger */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-700">View:</label>
                <select
                  value={shiftView}
                  onChange={(e) => setShiftView(e.target.value as '24h' | 'day' | 'night')}
                  className="bg-white border border-slate-300 rounded px-3 py-1 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-slate-500 focus:outline-none shadow-sm cursor-pointer"
                >
                  <option value="24h">24 Hour View</option>
                  <option value="day">Day Shift (6:00-18:00)</option>
                  <option value="night">Night Shift (18:00-6:00)</option>
                </select>
              </div>

              {hasCrudAccess && (
                <button
                  onClick={() => {
                    setBookingType('lockout');
                    setNewEquipName('');
                    setNewEquipNumber('');
                    setNewFault('');
                    setNewComments('');
                    setNewBookedDuration('unspecified');
                  if (sections.length > 0) setNewSectionId(sections[0].id);
                  const tzoffset = (new Date()).getTimezoneOffset() * 60000;
                  setCustomStartTime(new Date(Date.now() - tzoffset).toISOString().slice(0, 16));
                  setIsAddEquipmentModalOpen(true);
                }}
                className="flex items-center gap-1.5 bg-[#0D9488] hover:bg-[#0f766e] text-white text-xs font-bold px-3 py-1.5 rounded transition shadow-sm"
                title="Add a new equipment and schedule a breakdown or isolation lockout booking"
              >
                <Plus className="h-3.5 w-3.5 stroke-[3px]" /> Add Equipment / Booking
              </button>
            )}
          </div>
          </div>

          {/* Bottom Row: Select Date (Last 7 Days) */}
          <div className="border-t border-slate-300 pt-2.5">
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Select Day:
            </label>
            <div className="flex flex-wrap items-center gap-1.5">
              {last7Days.map(d => (
                <button
                  key={d.offset}
                  onClick={() => setDaysAgo(d.offset)}
                  className={`px-3 py-1 rounded text-xs font-bold transition-all flex items-center gap-1 ${
                    daysAgo === d.offset 
                      ? 'bg-blue-600 text-white shadow-sm' 
                      : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-200'
                  }`}
                >
                  <Calendar className="h-3 w-3" />
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 3. Legend Bar */}
        <div className="flex flex-wrap items-center gap-4 text-xs bg-white p-2.5 rounded-lg border border-slate-300 shadow-sm">
          <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Legend:</span>
          <span className="flex items-center gap-1.5 text-slate-700 font-semibold text-xs">
            <span className="h-3.5 w-6 rounded border border-rose-500" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #f43f5e 0px, #f43f5e 1.5px, #ffe4e6 1.5px, #ffe4e6 5px)', backgroundColor: '#ffe4e6' }}></span>
            Active Downtime / Breakdown
          </span>
          <span className="flex items-center gap-1.5 text-slate-700 font-semibold text-xs">
            <span className="h-3.5 w-6 rounded border border-amber-500" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #d97706 0px, #d97706 1.5px, #fef3c7 1.5px, #fef3c7 5px)', backgroundColor: '#fef3c7' }}></span>
            Active Isolation Lockout
          </span>
          <span className="flex items-center gap-1.5 text-slate-700 font-semibold text-xs">
            <span className="h-3.5 w-6 rounded border border-emerald-600" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #059669 0px, #059669 1.5px, #d1fae5 1.5px, #d1fae5 5px)', backgroundColor: '#d1fae5' }}></span>
            Lockout Returned / Tested OK
          </span>
        </div>

        {/* 4. Main Timeline Grid */}
        <div>
          {renderTimelineGridBody()}
        </div>
      </div>

      {/* POP OUT PRESENTATION OVERLAY MODE */}
      {isPopOutOpen && (
        <div className="fixed inset-0 bg-slate-900/95 z-50 p-4 md:p-6 overflow-y-auto flex flex-col space-y-4">
          <div className="bg-[#243447] text-white rounded-lg p-4 flex justify-between items-center shadow-lg">
            <div>
              <p className="text-slate-300 text-xs mt-0.5">
                Full screen presentation view for plant morning meeting
              </p>
              <p className="text-[10px] text-amber-400 font-extrabold mt-1 uppercase tracking-tighter opacity-90">
                Note: these downtimes are determined by bookings on this app. For true down times, please refer to the Eu report.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleExportScreenshot}
                disabled={isCapturing}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-xs text-white font-bold px-3.5 py-1.5 rounded shadow transition"
              >
                {isCapturing ? <Clock className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                {isCapturing ? 'Capturing...' : 'Export Screenshot'}
              </button>
              <button
                onClick={() => setIsPopOutOpen(false)}
                className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-500 text-xs text-white font-bold px-3.5 py-1.5 rounded shadow transition"
              >
                <Minimize2 className="h-3.5 w-3.5" /> Close Presentation
              </button>
            </div>
          </div>

          {/* Presentation Filters & Controls */}
          <div className="bg-slate-100 border border-slate-300 p-3 rounded-lg flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Select Plant Area:
              </label>
              <div className="flex flex-wrap items-center gap-1.5">
                {workGroups.map(wg => {
                  const sectionColor = getSectionColor(wg.name, wg.color);
                  const isSelected = selectedArea === wg.name;
                  return (
                    <button
                      key={wg.id}
                      onClick={() => setSelectedArea(wg.name)}
                      className={`px-3 py-1 rounded text-xs font-bold transition-all border-2 shadow-sm ${isSelected ? '' : 'hover:brightness-95'}`}
                      style={
                        isSelected
                          ? { backgroundColor: sectionColor, borderColor: sectionColor, color: isLightColor(sectionColor) ? '#0f172a' : '#ffffff' }
                          : { backgroundColor: '#ffffff', borderColor: sectionColor, color: sectionColor }
                      }
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: isSelected ? (isLightColor(sectionColor) ? '#0f172a' : '#ffffff') : sectionColor }}
                        />
                        {wg.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <label className="text-xs font-bold text-slate-700">View:</label>
              <select
                value={shiftView}
                onChange={(e) => setShiftView(e.target.value as '24h' | 'day' | 'night')}
                className="bg-white border border-slate-300 rounded px-3 py-1 text-xs font-bold text-slate-800 shadow-sm cursor-pointer"
              >
                <option value="24h">24 Hour View</option>
                <option value="day">Day Shift (6:00-18:00)</option>
                <option value="night">Night Shift (18:00-6:00)</option>
              </select>
            </div>
          </div>

          {/* Presentation Body */}
          <div className="bg-white p-4 rounded-lg border border-slate-300 shadow-xl space-y-4">
            {renderTimelineGridBody()}
          </div>
        </div>
      )}

      {/* TIMELINE BOOK LOCKOUT MODAL (For Schedulers / Reporters) */}
      {isBookModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[150] overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-lg shadow-2xl">
            <div className="flex justify-between items-center border-b border-gray-700 p-4">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Lock className="h-5 w-5 text-amber-500 animate-pulse" />
                BOOK ISOLATION: {selectedEquipmentName}
              </h3>
              <button 
                onClick={() => setIsBookModalOpen(false)}
                className="text-gray-400 hover:text-white transition"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleBookLockoutSubmit} className="p-5 space-y-4">
              <div className="bg-gray-900 p-3 rounded-lg border border-gray-850">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Target Equipment:</p>
                <p className="text-sm font-extrabold text-white mt-0.5">
                  [{selectedEquipmentNumber}] {selectedEquipmentName}
                </p>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-2.5">Timeline Area:</p>
                <p className="text-xs font-bold text-blue-400 mt-0.5">
                  {selectedArea}
                </p>
              </div>

              {/* Booked Duration */}
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">Booked Duration:</label>
                <select
                  value={bookedDuration}
                  onChange={(e) => setBookedDuration(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:ring-amber-500 focus:border-amber-500"
                >
                  <option value="unspecified">Unspecified duration</option>
                  <option value="out_of_production">Out of Production</option>
                  <option value="30">30 Minutes</option>
                  <option value="60">1 Hour (60 mins)</option>
                  <option value="120">2 Hours (120 mins)</option>
                  <option value="240">4 Hours (240 mins)</option>
                  <option value="480">8 Hours (480 mins)</option>
                  <option value="720">12 Hours (720 mins)</option>
                </select>
              </div>

              {/* Isolation padlock notes */}
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">Isolation Comments & Padlock Info:</label>
                <textarea
                  placeholder="Describe electrical/mechanical isolation locks, permits, and scope of maintenance work (optional)..."
                  value={lockoutComments}
                  onChange={(e) => setLockoutComments(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-white text-sm h-24 focus:ring-amber-500"
                />
              </div>

              {/* Employee ID */}
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">Your Employee Number (Required):</label>
                <input
                  type="text"
                  required
                  placeholder="Enter employee identifier"
                  value={empNumber}
                  onChange={(e) => setEmpNumber(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:ring-amber-500"
                />
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-gray-700">
                <button
                  type="button"
                  onClick={() => setIsBookModalOpen(false)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm text-white font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 rounded-lg text-sm text-gray-950 font-black"
                >
                  Confirm Lockout
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TIMELINE RETURN / UNLOCK MODAL */}
      {isReturnModalOpen && selectedTicket && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[150] overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-lg shadow-2xl">
            <div className="flex justify-between items-center border-b border-gray-700 p-4">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Unlock className="h-5 w-5 text-green-500 animate-pulse" />
                UNLOCK & RETURN EQUIPMENT
              </h3>
              <button 
                onClick={() => {
                  setIsReturnModalOpen(false);
                  setSelectedTicket(null);
                }}
                className="text-gray-400 hover:text-white transition"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleReturnTicketSubmit} className="p-5 space-y-4">
              <div className="bg-gray-900 p-3 rounded-lg border border-gray-850">
                <p className="text-[10px] text-gray-400 font-bold">Equipment:</p>
                <p className="text-sm font-extrabold text-white">
                  [{selectedTicket.equipmentNumber}] {selectedTicket.equipment}
                </p>
                <p className="text-[10px] text-gray-400 font-bold mt-2.5">Locked By:</p>
                <p className="text-xs text-gray-300">
                  {selectedTicket.lockedByUserName} (Emp #{selectedTicket.lockedByUserEmployeeNumber || 'N/A'})
                </p>
              </div>

              {/* Status outcome */}
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-2">Test Run Outcome:</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer bg-green-950/40 border border-green-800 p-3 rounded-lg flex-1">
                    <input
                      type="radio"
                      name="timeline_test_status"
                      checked={testSuccessful}
                      onChange={() => setTestSuccessful(true)}
                      className="bg-gray-800 border-gray-700 text-green-500 focus:ring-green-500"
                    />
                    <span className="text-xs font-bold text-green-400 uppercase">Tested & OK</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer bg-red-950/40 border border-red-800 p-3 rounded-lg flex-1">
                    <input
                      type="radio"
                      name="timeline_test_status"
                      checked={!testSuccessful}
                      onChange={() => setTestSuccessful(false)}
                      className="bg-gray-800 border-gray-700 text-red-500 focus:ring-red-500"
                    />
                    <span className="text-xs font-bold text-red-400 uppercase">Failed Test</span>
                  </label>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">Testing & Unlock comments:</label>
                <textarea
                  placeholder="Describe test outcomes and operational control handback (optional)..."
                  value={unlockComments}
                  onChange={(e) => setUnlockComments(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-white text-sm h-24 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              {/* Return Emp ID */}
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">Your Employee Number (Required):</label>
                <input
                  type="text"
                  required
                  placeholder="Enter employee number"
                  value={returnEmpNumber}
                  onChange={(e) => setReturnEmpNumber(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:ring-green-500 focus:border-green-500"
                />
              </div>

              {/* Checkbox Checklist verification toggle */}
              <div className="bg-yellow-950/20 border border-yellow-800/60 p-4 rounded-lg">
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={confirmTested}
                    onChange={(e) => setConfirmTested(e.target.checked)}
                    required
                    className="rounded bg-gray-800 border-gray-700 text-green-500 focus:ring-green-500 h-5 w-5 mt-0.5"
                  />
                  <div className="text-xs text-yellow-200 leading-relaxed font-bold">
                    I solemnly verify that my lockout padlock has been unlocked/removed, and the equipment has been safely run and tested before handover back to production.
                  </div>
                </label>
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-gray-700">
                <button
                  type="button"
                  onClick={() => {
                    setIsReturnModalOpen(false);
                    setSelectedTicket(null);
                  }}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm text-white font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!confirmTested}
                  className="px-5 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-black disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Unlock & Return
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* RICH DESCRIPTION DETAILS TOAST / POPUP PANEL */}
      {activeToast && (
        <div className="fixed bottom-6 right-6 z-[150] max-w-md w-full bg-gray-950 border border-gray-800 rounded-xl shadow-2xl p-5 space-y-4 animate-in slide-in-from-bottom-5 duration-200">
          <div className="flex justify-between items-start gap-2">
            <div>
              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                activeToast.type === 'breakdown' 
                  ? 'bg-red-950 text-red-400 border border-red-900/60' 
                  : activeToast.type === 'lockout_active' 
                    ? 'bg-amber-950 text-amber-400 border border-amber-900/60' 
                    : 'bg-green-950 text-green-400 border border-green-900/60'
              }`}>
                {activeToast.type === 'breakdown' ? 'Active Breakdown / Downtime' : activeToast.status === 'Locked' ? 'Active Isolation Lockout' : 'Returned Lockout'}
              </span>
              <h4 className="text-sm font-extrabold text-white mt-1.5 leading-tight">{activeToast.title}</h4>
              {activeToast.subtitle && <p className="text-[11px] text-gray-400 mt-0.5">{activeToast.subtitle}</p>}
            </div>
            <button 
              onClick={() => setActiveToast(null)}
              className="text-gray-400 hover:text-white transition p-1 bg-gray-900 hover:bg-gray-800 rounded-lg"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="bg-gray-900/80 p-3 rounded-lg border border-gray-850 space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-blue-400 font-extrabold">
              <Clock className="h-4 w-4 shrink-0" />
              <span>Total Duration: {activeToast.durationText}</span>
            </div>
            {(activeToast.type === 'lockout_active' || activeToast.type === 'lockout_returned') && (
              <div className="flex items-center gap-1.5 bg-red-950/20 border border-red-900/30 p-1.5 rounded-md">
                <AlertTriangle className="h-3 w-3 text-red-500 shrink-0" />
                <p className="text-[9px] font-bold text-red-300 uppercase leading-tight">
                  Does not substitute lockout procedure. Always do positive test.
                </p>
              </div>
            )}
            <p className="text-xs text-gray-300 whitespace-pre-line leading-relaxed border-t border-gray-800/80 pt-2 font-medium">
              {activeToast.details}
            </p>
          </div>

          <div className="flex justify-end gap-2.5 pt-1">
            <button
              onClick={() => setActiveToast(null)}
              className="px-3.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-xs text-gray-300 font-bold rounded-lg transition"
            >
              Dismiss
            </button>

            {/* Custom breakdown edit times for Scheduler/Reporter/Admin */}
            {activeToast.report && hasCrudAccess && (
              <button
                onClick={() => {
                  const report = activeToast.report!;
                  setEditingReport(report);
                  
                  const tzoffset = (new Date()).getTimezoneOffset() * 60000;
                  const startTimeLocal = new Date(new Date(report.reportingTime).getTime() - tzoffset).toISOString().slice(0, 16);
                  setEditReportStartTime(startTimeLocal);

                  let endTime = report.completedTime || report.resolutionTime || '';
                  if (endTime) {
                    const endTimeLocal = new Date(new Date(endTime).getTime() - tzoffset).toISOString().slice(0, 16);
                    setEditReportEndTime(endTimeLocal);
                  } else {
                    setEditReportEndTime('');
                  }
                  
                  setIsEditReportTimesModalOpen(true);
                  setActiveToast(null);
                }}
                className="px-3.5 py-1.5 bg-indigo-650 hover:bg-indigo-550 text-xs text-white font-extrabold rounded-lg flex items-center gap-1 shadow transition"
                title="Edit breakdown reporting and resolution times"
              >
                Edit Times
              </button>
            )}

            {/* Custom isolation (ticket) actions for Scheduler/Reporter/Admin */}
            {activeToast.ticket && hasCrudAccess && (
              <>
                <button
                  onClick={() => {
                    const ticket = activeToast.ticket!;
                    setEditingTicket(ticket);
                    setEditComments(ticket.lockoutComments || '');
                    setEditDuration(ticket.bookedDurationMinutes ? String(ticket.bookedDurationMinutes) : 'unspecified');
                    
                    const tzoffset = (new Date()).getTimezoneOffset() * 60000;
                    const startTimeLocal = new Date(new Date(ticket.lockoutTime).getTime() - tzoffset).toISOString().slice(0, 16);
                    setEditStartTime(startTimeLocal);

                    if (ticket.unlockTime) {
                      const returnTimeLocal = new Date(new Date(ticket.unlockTime).getTime() - tzoffset).toISOString().slice(0, 16);
                      setEditReturnTime(returnTimeLocal);
                    } else {
                      setEditReturnTime('');
                    }
                    
                    setIsEditTicketModalOpen(true);
                    setActiveToast(null);
                  }}
                  className="px-3.5 py-1.5 bg-indigo-650 hover:bg-indigo-550 text-xs text-white font-extrabold rounded-lg flex items-center gap-1 shadow transition"
                  title="Edit custom booking start time, duration, and comments"
                >
                  Edit Booking
                </button>
                <button
                  onClick={async () => {
                    console.log("Delete button clicked, ticket ID:", activeToast.ticket?.id);
                    console.log("Proceeding with deletion...");
                    try {
                      const cached = JSON.parse(localStorage.getItem('cache_jobTickets') || '[]');
                      const updated = cached.filter((t: JobTicket) => t.id !== activeToast.ticket!.id);
                      localStorage.setItem('cache_jobTickets', JSON.stringify(updated));
                      window.dispatchEvent(new Event('storage'));
                      console.log("Deletion successful.");
                      setActiveToast(null);
                    } catch (err) {
                      console.error("Error deleting ticket:", err);
                    }
                  }}
                  className="px-3.5 py-1.5 bg-red-650 hover:bg-red-550 text-xs text-white font-extrabold rounded-lg flex items-center gap-1 shadow transition"
                  title="Permanently remove this booking from the database"
                >
                  Delete Booking
                </button>
              </>
            )}

            {activeToast.type === 'lockout_active' && hasCrudAccess && activeToast.ticket && (
              <button
                onClick={async () => {
                    if (window.confirm("Confirm equipment is back in production?")) {
                        try {
                            const cached = JSON.parse(localStorage.getItem('cache_jobTickets') || '[]');
                            const updated = cached.map((t: JobTicket) => t.id === activeToast.ticket!.id ? {
                                ...t,
                                status: 'Returned',
                                unlockTime: new Date().toISOString(),
                                unlockComments: 'Back in production (Reporter action)',
                                returnedByUserId: user.id,
                                returnedByUserName: user.name,
                                returnedByUserEmployeeNumber: user.employeeNumber || null
                            } : t);
                            localStorage.setItem('cache_jobTickets', JSON.stringify(updated));
                            window.dispatchEvent(new Event('storage'));
                            setActiveToast(null);
                        } catch (err) {
                            console.error("Error returning ticket:", err);
                        }
                    }
                }}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-xs text-white font-extrabold rounded-lg flex items-center gap-1 shadow transition"
              >
                <Unlock className="h-3.5 w-3.5" /> Back in Production
              </button>
            )}
            
            {activeToast.type === 'lockout_active' && hasCrudAccess && activeToast.ticket && (
              <button
                onClick={() => {
                  setSelectedTicket(activeToast.ticket!);
                  setReturnEmpNumber(user.employeeNumber || '');
                  setIsReturnModalOpen(true);
                  setActiveToast(null);
                }}
                className="px-3.5 py-1.5 bg-green-600 hover:bg-green-500 text-xs text-white font-extrabold rounded-lg flex items-center gap-1 shadow transition"
              >
                <Unlock className="h-3.5 w-3.5" /> Unlock & Return
              </button>
            )}
          </div>
        </div>
      )}
      {/* ADD EQUIPMENT & CREATE CUSTOM BOOKING MODAL */}
      {isAddEquipmentModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[150] overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-lg shadow-2xl">
            <div className="flex justify-between items-center border-b border-gray-700 p-4">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Plus className="h-5 w-5 text-[#0D9488]" />
                ADD EQUIPMENT & BOOKING
              </h3>
              <button 
                onClick={() => setIsAddEquipmentModalOpen(false)}
                className="text-gray-400 hover:text-white transition"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleAddEquipmentBookingSubmit} className="p-5 space-y-4 text-left">
              {/* Equipment details */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">Equipment Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Conveyor"
                    value={newEquipName}
                    onChange={(e) => setNewEquipName(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:ring-[#0D9488]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">Tag ID / Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. L78 EL01 CV01"
                    value={newEquipNumber}
                    onChange={(e) => setNewEquipNumber(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:ring-[#0D9488]"
                  />
                </div>
              </div>

              {/* WorkGroup info badge */}
              <div className="bg-gray-900/60 p-2.5 rounded-lg border border-gray-850 flex justify-between items-center text-xs">
                <span className="text-gray-400 font-semibold">Area / WorkGroup:</span>
                <span className="text-blue-400 font-extrabold">{selectedArea}</span>
              </div>

              {/* Booking Type */}
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-2">Booking Type *</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer bg-gray-900/60 border border-gray-700 p-3 rounded-lg flex-1">
                    <input
                      type="radio"
                      name="meeting_booking_type"
                      checked={bookingType === 'lockout'}
                      onChange={() => setBookingType('lockout')}
                      className="bg-gray-800 border-gray-700 text-[#0D9488] focus:ring-[#0D9488]"
                    />
                    <div>
                      <span className="text-xs font-bold text-amber-400 block">Isolation Lockout</span>
                      <span className="text-[10px] text-gray-400 block font-normal">Add padlock isolation block</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer bg-gray-900/60 border border-gray-700 p-3 rounded-lg flex-1">
                    <input
                      type="radio"
                      name="meeting_booking_type"
                      checked={bookingType === 'breakdown'}
                      onChange={() => setBookingType('breakdown')}
                      className="bg-gray-800 border-gray-700 text-[#0D9488] focus:ring-[#0D9488]"
                    />
                    <div>
                      <span className="text-xs font-bold text-red-400 block">Breakdown Report</span>
                      <span className="text-[10px] text-gray-400 block font-normal">Add active downtime fault block</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Custom Start Time */}
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">Start Time / Reporting Time *</label>
                <input
                  type="datetime-local"
                  required
                  value={customStartTime}
                  onChange={(e) => setCustomStartTime(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:ring-[#0D9488]"
                />
              </div>

              {/* Dynamic form conditional parts */}
              {bookingType === 'breakdown' ? (
                <>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1">Reported Fault *</label>
                    <input
                      type="text"
                      required={bookingType === 'breakdown'}
                      placeholder="Describe the electrical/mechanical fault..."
                      value={newFault}
                      onChange={(e) => setNewFault(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:ring-[#0D9488]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 mb-1">Urgency *</label>
                      <select
                        value={newUrgency}
                        onChange={(e) => setNewUrgency(parseInt(e.target.value, 10))}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:ring-[#0D9488]"
                      >
                        <option value={1}>1 - Low Priority</option>
                        <option value={2}>2 - Medium Priority</option>
                        <option value={3}>3 - High Priority</option>
                        <option value={4}>4 - Emergency Shutdown</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-400 mb-1">Section / Discipline *</label>
                      <select
                        value={newSectionId}
                        onChange={(e) => setNewSectionId(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:ring-[#0D9488]"
                      >
                        {sections.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1">Booked Duration:</label>
                    <select
                      value={newBookedDuration}
                      onChange={(e) => setNewBookedDuration(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:ring-[#0D9488]"
                    >
                      <option value="unspecified">Unspecified duration</option>
                      <option value="out_of_production">Out of Production</option>
                      <option value="30">30 Minutes</option>
                      <option value="60">1 Hour (60 mins)</option>
                      <option value="120">2 Hours (120 mins)</option>
                      <option value="240">4 Hours (240 mins)</option>
                      <option value="480">8 Hours (480 mins)</option>
                      <option value="720">12 Hours (720 mins)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1">Isolation Comments & Padlock Info:</label>
                    <textarea
                      placeholder="Specify padlock, lock number, safety permit, or work scope (optional)..."
                      value={newComments}
                      onChange={(e) => setNewComments(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-white text-sm h-20 focus:ring-[#0D9488]"
                    />
                  </div>
                </>
              )}

              {/* Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-gray-700">
                <button
                  type="button"
                  onClick={() => setIsAddEquipmentModalOpen(false)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm text-white font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#0D9488] hover:bg-[#0f766e] text-white rounded-lg text-sm font-black shadow-lg"
                >
                  Create Booking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT TICKETS / CUSTOM ISOLATIONS MODAL */}
      {isEditTicketModalOpen && editingTicket && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[150] overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-lg shadow-2xl">
            <div className="flex justify-between items-center border-b border-gray-700 p-4">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Lock className="h-5 w-5 text-indigo-400" />
                EDIT ISOLATION LOCKOUT BOOKING
              </h3>
              <button 
                onClick={() => {
                  setIsEditTicketModalOpen(false);
                  setEditingTicket(null);
                }}
                className="text-gray-400 hover:text-white transition"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleEditTicketSubmit} className="p-5 space-y-4 text-left">
              <div className="bg-gray-900 p-3 rounded-lg border border-gray-850">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Target Equipment:</p>
                <p className="text-sm font-extrabold text-white mt-0.5">
                  [{editingTicket.equipmentNumber}] {editingTicket.equipment}
                </p>
              </div>

              {/* Start Time */}
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">Start Time / Lockout Time *</label>
                <input
                  type="datetime-local"
                  required
                  value={editStartTime}
                  onChange={(e) => setEditStartTime(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:ring-indigo-500"
                />
              </div>

              {/* Return Time (only if Returned) */}
              {editingTicket.status === 'Returned' && (
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">Return Time / Unlock Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={editReturnTime}
                    onChange={(e) => setEditReturnTime(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:ring-indigo-500"
                  />
                </div>
              )}

              {/* Booked Duration (only if Locked) */}
              {editingTicket.status === 'Locked' && (
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">Booked Duration:</label>
                  <select
                    value={editDuration}
                    onChange={(e) => setEditDuration(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:ring-indigo-500"
                  >
                    <option value="unspecified">Unspecified duration</option>
                    <option value="out_of_production">Out of Production</option>
                    <option value="30">30 Minutes</option>
                    <option value="60">1 Hour (60 mins)</option>
                    <option value="120">2 Hours (120 mins)</option>
                    <option value="240">4 Hours (240 mins)</option>
                    <option value="480">8 Hours (480 mins)</option>
                    <option value="720">12 Hours (720 mins)</option>
                  </select>
                </div>
              )}

              {/* Isolation padlock notes */}
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">Comments & Padlock Info:</label>
                <textarea
                  placeholder="Lock info or work scope description..."
                  value={editComments}
                  onChange={(e) => setEditComments(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-white text-sm h-24 focus:ring-indigo-500"
                />
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-gray-700">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditTicketModalOpen(false);
                    setEditingTicket(null);
                  }}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm text-white font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-black shadow-lg"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT BREAKDOWN REPORT TIMES MODAL */}
      {/* EDIT BREAKDOWN & BOOKINGS MODAL */}
      {isEditReportTimesModalOpen && editingReport && (
        <EditReportModal
          isOpen={true}
          onClose={() => {
            setIsEditReportTimesModalOpen(false);
            setEditingReport(null);
          }}
          report={editingReport}
          onSubmit={async (id, updates) => {
            if (updateReport) {
              await updateReport(id, updates);
            } else {
              const cached = JSON.parse(localStorage.getItem('cache_reports') || '[]');
              const updated = cached.map((r: BreakdownReport) => r.id === id ? { ...r, ...updates } : r);
              localStorage.setItem('cache_reports', JSON.stringify(updated));
              window.dispatchEvent(new Event('storage'));
            }
            setIsEditReportTimesModalOpen(false);
            setEditingReport(null);
          }}
          currentUser={user}
          resolutionStatuses={[]}
        />
      )}
    </div>
  );
};
