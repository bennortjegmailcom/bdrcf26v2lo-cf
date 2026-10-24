
import React, { useState, useMemo, useEffect } from 'react';
/* Added Assignment to the imports from ../types */
import { BreakdownReport, User, Role, Status, Assignment } from '../types';
import { calculateDuration } from '../utils';
import Badge from './ui/Badge';
import HistoryCell from './ui/HistoryCell';

interface BreakdownTableProps {
  onOpenComments?: (report: BreakdownReport) => void;
  reports: BreakdownReport[];
  user: User;
  onAssign?: (report: BreakdownReport) => void;
  onResolve?: (report: BreakdownReport) => void;
  onComplete?: (report: BreakdownReport) => void;
  onReportAgain?: (reportId: string) => void;
  onDelete?: (reportId: string) => void;
  onEdit?: (report: BreakdownReport) => void;
  onUpdateReport?: (reportId: string, updates: Partial<BreakdownReport>) => void;
  onFilterArtisan?: (artisanId: string, artisanName: string) => void;
  readOnly?: boolean;
  resolutionStatuses?: import('../types').ResolutionStatusItem[];
  onOpenEquipmentOverview?: (report: BreakdownReport) => void;
  onNavigateToGallery?: (report: BreakdownReport) => void;
}

type SortField = 'artisan' | 'workGroup' | 'equipment' | 'equipmentNumber' | null;
type SortDirection = 'asc' | 'desc';

const CopyButton = ({ text, className }: { text: string; className?: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!text || text === '-' || text === 'N/A') return;

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(err => console.error('Failed to copy:', err));
  };

  if (!text || text === '-' || text === 'N/A') return null;

  const defaultClasses = "absolute top-1 right-1 p-1 text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 focus:opacity-100 z-10 print:hidden";

  return (
    <button
      onClick={handleCopy}
      className={className || defaultClasses}
      title="Copy to clipboard"
    >
      {copied ? (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-green-500" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
        </svg>
      )}
    </button>
  );
};

const wrapTextAtLength = (text: string, maxLen: number = 20): string[] => {
  if (!text) return ['-'];
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if (word.length > maxLen) {
      if (currentLine) {
        lines.push(currentLine);
        currentLine = '';
      }
      let remainingWord = word;
      while (remainingWord.length > maxLen) {
        lines.push(remainingWord.slice(0, maxLen));
        remainingWord = remainingWord.slice(maxLen);
      }
      currentLine = remainingWord;
    } else if ((currentLine ? currentLine.length + 1 : 0) + word.length > maxLen) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = currentLine ? `${currentLine} ${word}` : word;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines;
};

const QuickTimeAdjuster: React.FC<{
    report: BreakdownReport;
    field: 'assignedTime' | 'resolutionTime' | 'reportingTime';
    onUpdate: (reportId: string, updates: Partial<BreakdownReport>) => void;
    currentValue?: string;
    canEdit: boolean;
}> = ({ report, field, onUpdate, currentValue, canEdit }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [tempTime, setTempTime] = useState('');

    const toInputDate = (isoString?: string) => {
        if (!isoString) return '';
        const date = new Date(isoString);
        date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
        return date.toISOString().slice(0, 16);
    };

    const handleStartEdit = (e: React.MouseEvent) => {
        e.stopPropagation();
        setTempTime(toInputDate(currentValue || new Date().toISOString()));
        setIsEditing(true);
    };

    const handleSave = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (tempTime) {
            onUpdate(report.id, { [field]: new Date(tempTime).toISOString() });
        }
        setIsEditing(false);
    };

    const handleCancel = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsEditing(false);
    };

    const displayTime = currentValue ? new Date(currentValue).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '-';

    if (!canEdit) return <span>{displayTime}</span>;

    if (isEditing) {
        return (
            <div className="flex items-center space-x-1" onClick={e => e.stopPropagation()}>
                <input 
                    type="datetime-local" 
                    value={tempTime} 
                    onChange={e => setTempTime(e.target.value)}
                    className="bg-gray-700 text-white text-[10px] p-0.5 rounded border border-gray-600 w-28"
                    autoFocus
                />
                <button onClick={handleSave} className="text-green-500 hover:text-green-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                </button>
                <button onClick={handleCancel} className="text-gray-400 hover:text-gray-300">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                </button>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-between group/time relative">
            <span>{displayTime}</span>
            <button 
                onClick={handleStartEdit} 
                className="opacity-0 group-hover/time:opacity-100 transition-opacity ml-1 p-0.5 text-blue-400 hover:text-blue-300 bg-gray-700/50 rounded print:hidden"
                title="Quick Adjust Time"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
            </button>
        </div>
    );
};

const ExpandableText: React.FC<{ text: string; maxWords?: number; wrapLimit?: number }> = ({ text, maxWords = 30, wrapLimit = 20 }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const words = text.split(/\s+/);
  const isLong = words.length > maxWords;

  const displayText = isExpanded ? text : (isLong ? words.slice(0, maxWords).join(' ') + '...' : text);

  if (!isLong) {
      return (
          <span className="block">
              {wrapTextAtLength(text, wrapLimit).map((line, idx) => (
                  <span key={idx} className="block whitespace-nowrap">
                      {line}
                  </span>
              ))}
          </span>
      );
  }

  return (
    <div 
      className="cursor-pointer group/expand relative" 
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <span className={`block ${isExpanded ? "" : "text-gray-300"}`}>
          {wrapTextAtLength(displayText, wrapLimit).map((line, idx) => (
              <span key={idx} className="block whitespace-nowrap">
                  {line}
              </span>
          ))}
      </span>
      {!isExpanded && (
        <div className="absolute z-50 hidden group-hover/expand:block bg-gray-900 text-white p-3 rounded shadow-2xl border border-gray-600 max-w-sm left-0 top-full mt-1 text-xs pointer-events-none">
          <p className="font-semibold text-blue-400 mb-1 text-[10px] uppercase">Full Description:</p>
          <span className="block">
              {wrapTextAtLength(text, wrapLimit).map((line, idx) => (
                  <span key={idx} className="block whitespace-nowrap">
                      {line}
                  </span>
              ))}
          </span>
        </div>
      )}
      <span className="ml-1 text-[10px] text-blue-400 hover:text-blue-300 font-bold print:hidden block mt-1">
        {isExpanded ? "(less)" : "(more)"}
      </span>
    </div>
  );
};

const BreakdownTable: React.FC<BreakdownTableProps> = ({
  onOpenComments,
  reports,
  user,
  onAssign,
  onResolve,
  onComplete,
  onReportAgain,
  onDelete,
  onEdit,
  onUpdateReport,
  onFilterArtisan,
  readOnly = false,
  resolutionStatuses = [],
  onOpenEquipmentOverview,
}) => {
  const isReporter = user.role === Role.REPORTER;
  const isCoordinator = user.role === Role.COORDINATOR;
  const isMaintForeman = user.role === Role.FOREMAN;
  const isOpsForeman = user.role === Role.OPS_FOREMAN;
  const isScheduler = user.role === Role.SCHEDULER;
  const isAdmin = user.role === Role.ADMIN;
  const isSupervisor = user.role === Role.MECH_SUPERVISOR || user.role === Role.ELEC_SUPERVISOR || user.role === Role.TECH_SUPERVISOR || user.role === Role.INST_SUPERVISOR;
  
  // Management actions permissions (Assign, Resolve)
  const canManage = isScheduler || isAdmin || isMaintForeman || isSupervisor;
  
  // Acknowledge permission: day shift leads, supervisors, foremen, schedulers, coordinators, admins
  const canAcknowledgeDayShift = isScheduler || isCoordinator || isAdmin || isSupervisor || isMaintForeman || isOpsForeman;

  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [equipmentFilter, setEquipmentFilter] = useState<string>('');
  const [fgNumberFilter, setFgNumberFilter] = useState<string>('');

  const [wrapLimit, setWrapLimit] = useState(20);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width <= 640) {
        setWrapLimit(15);
      } else if (width >= 1536) {
        setWrapLimit(30);
      } else {
        // Linearly scale from 15 to 30 between 640px and 1536px
        const percentage = (width - 640) / (1536 - 640);
        const dynamicLimit = 15 + Math.round(percentage * 15);
        setWrapLimit(dynamicLimit);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const availableEquipments = useMemo(() => {
    const set = new Set<string>();
    reports.forEach(r => {
      if (r.equipment) set.add(r.equipment);
    });
    return Array.from(set).sort();
  }, [reports]);

  const availableFgNumbers = useMemo(() => {
    const set = new Set<string>();
    reports.forEach(r => {
      if (r.equipmentNumber) set.add(r.equipmentNumber);
    });
    return Array.from(set).sort();
  }, [reports]);

  const sortedReports = useMemo(() => {
      let filtered = reports;

      if (equipmentFilter) {
        filtered = filtered.filter(r => r.equipment === equipmentFilter);
      }

      if (fgNumberFilter) {
        const query = fgNumberFilter.trim().toLowerCase();
        filtered = filtered.filter(r => (r.equipmentNumber || '').toLowerCase().includes(query));
      }

      if (!sortField) return filtered;
 
      const sorted = [...filtered].sort((a, b) => {
          let aVal = '';
          let bVal = '';
 
          if (sortField === 'artisan') {
              aVal = (a.assignments?.[0]?.artisanName || '').toLowerCase();
              bVal = (b.assignments?.[0]?.artisanName || '').toLowerCase();
          } else if (sortField === 'workGroup') {
              aVal = (a.workGroup || '').toLowerCase();
              bVal = (b.workGroup || '').toLowerCase();
          } else if (sortField === 'equipment') {
              aVal = (a.equipment || '').toLowerCase();
              bVal = (b.equipment || '').toLowerCase();
          } else if (sortField === 'equipmentNumber') {
              aVal = (a.equipmentNumber || '').toLowerCase();
              bVal = (b.equipmentNumber || '').toLowerCase();
          }
 
          if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
          if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
          return 0;
      });
 
      return sorted;
  }, [reports, sortField, sortDirection, equipmentFilter, fgNumberFilter]);
 
  const handleSort = (field: SortField) => {
      if (sortField === field) {
          setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
      } else {
          setSortField(field);
          setSortDirection('asc');
      }
  };

  // Actions visibility logic: show column if ANY action prop is provided
  const hasActions = !!(onAssign || onResolve || onComplete || onReportAgain || onDelete || onEdit || (!readOnly && onUpdateReport));

  const formatDate = (isoString: string | undefined) => {
      if (!isoString) return '-';
      return new Date(isoString).toLocaleDateString(undefined, { month: '2-digit', day: '2-digit' });
  };

  const formatTime = (isoString: string | undefined) => {
    if (!isoString) return '-';
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const getAssignmentText = (assignments: Assignment[]) => {
    if (!assignments || assignments.length === 0) return '';
    return assignments.map(a => `${a.artisanName} (${a.responsibility}${a.specialty ? ` - ${a.specialty}` : ''}${a.contactNumber ? ` - ${a.contactNumber}` : ''})`).join(', ');
  };

  return (
    <div className={`bg-gray-800 rounded-lg shadow-lg overflow-hidden flex-1 flex flex-col ${readOnly ? 'bg-white text-black print:shadow-none print:overflow-visible print:bg-transparent' : ''}`}>
      {!readOnly && (
        <div className="bg-gray-900/70 p-2 border-b border-gray-700/80 flex flex-wrap items-center justify-between gap-2 text-xs print:hidden">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Equipment Filter Dropdown */}
            <div className="flex items-center space-x-1.5">
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Equipment:</label>
              <select 
                value={equipmentFilter} 
                onChange={e => setEquipmentFilter(e.target.value)}
                className="bg-gray-800 text-white text-xs border border-gray-600 rounded px-2 py-1 focus:outline-none focus:border-blue-500"
              >
                <option value="">All Equipment ({availableEquipments.length})</option>
                {availableEquipments.map(eq => (
                  <option key={eq} value={eq}>{eq}</option>
                ))}
              </select>
            </div>

            {/* FG Number Search / Filter */}
            <div className="flex items-center space-x-1.5">
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">FG No:</label>
              <div className="relative flex items-center">
                <input 
                  type="text"
                  placeholder="Filter FG No..."
                  value={fgNumberFilter}
                  onChange={e => setFgNumberFilter(e.target.value)}
                  list="fg-numbers-list"
                  className="bg-gray-800 text-white text-xs border border-gray-600 rounded px-2 py-1 pl-6 pr-6 w-36 focus:outline-none focus:border-blue-500 placeholder-gray-500"
                />
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-gray-400 absolute left-1.5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <datalist id="fg-numbers-list">
                  {availableFgNumbers.map(fg => (
                    <option key={fg} value={fg} />
                  ))}
                </datalist>
                {fgNumberFilter && (
                  <button 
                    onClick={() => setFgNumberFilter('')}
                    className="absolute right-1.5 text-gray-400 hover:text-white text-xs font-bold"
                    title="Clear FG filter"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Quick Sort Buttons */}
            <div className="flex items-center space-x-1 border-l border-gray-700/80 pl-2">
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Sort:</span>
              <button 
                onClick={() => handleSort('equipment')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition flex items-center ${sortField === 'equipment' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'}`}
              >
                Equipment {sortField === 'equipment' ? (sortDirection === 'asc' ? ' ↑' : ' ↓') : ''}
              </button>
              <button 
                onClick={() => handleSort('equipmentNumber')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition flex items-center ${sortField === 'equipmentNumber' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'}`}
              >
                FG No {sortField === 'equipmentNumber' ? (sortDirection === 'asc' ? ' ↑' : ' ↓') : ''}
              </button>
            </div>
          </div>

          {/* Active Filters Clear Button */}
          {(equipmentFilter || fgNumberFilter || sortField) && (
            <div className="flex items-center space-x-2">
              <span className="text-[10px] text-gray-400">{sortedReports.length} of {reports.length} reports</span>
              <button 
                onClick={() => { setEquipmentFilter(''); setFgNumberFilter(''); setSortField(null); }}
                className="text-[10px] text-red-400 hover:text-red-300 font-semibold underline"
              >
                Reset Filters
              </button>
            </div>
          )}
        </div>
      )}

      <div className="overflow-x-auto custom-scrollbar print:overflow-visible h-full pb-2">
        <table className={`min-w-full text-sm text-left ${readOnly ? 'text-gray-900 print:w-full print:table-fixed print:text-[0.55rem]' : 'text-gray-300'}`}>
          <thead className={`${readOnly ? 'bg-gray-200 text-gray-900 border-b-2 border-gray-400 print:bg-gray-100 print:border-gray-500' : 'bg-gray-700 text-gray-300'} text-[10px] uppercase tracking-wider`}>
            <tr>
              <th scope="col" className="px-1.5 py-2 print:px-0.5 print:py-1 w-[8%] sticky left-0 z-10 bg-inherit border-r border-gray-600 print:border-gray-400 print:border-l">Status+Urg.</th>
              <th 
                scope="col" 
                className={`px-1.5 py-2 print:px-0.5 print:py-1 w-[8%] print:border-r print:border-gray-400 cursor-pointer hover:bg-gray-600 select-none`}
                onClick={() => handleSort('equipment')}
              >
                  <div className="flex items-center">
                    Equipment
                    {sortField === 'equipment' && (
                        <span className="ml-1 text-blue-400">
                            {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                    )}
                  </div>
              </th>
              <th 
                scope="col" 
                className="px-1.5 py-2 print:px-0.5 print:py-1 w-[6%] print:border-r print:border-gray-400 cursor-pointer hover:bg-gray-600 select-none"
                onClick={() => handleSort('equipmentNumber')}
              >
                  <div className="flex items-center">
                    FG Number
                    {sortField === 'equipmentNumber' && (
                        <span className="ml-1 text-blue-400">
                            {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                    )}
                  </div>
              </th>
              <th scope="col" className="px-1.5 py-2 print:px-0.5 print:py-1 w-[8%] border-l border-gray-700 print:border-gray-400 print:border-r">Team Member</th>
              <th scope="col" className="px-1.5 py-2 print:px-0.5 print:py-1 w-[12%] print:border-r print:border-gray-400">Fault</th>
              <th scope="col" className="px-1.5 py-2 print:px-0.5 print:py-1 w-[10%] print:border-r print:border-gray-400">Details</th>
              <th scope="col" className="px-1.5 py-2 print:px-0.5 print:py-1 w-[5%] print:border-r print:border-gray-400">Date</th>
              <th scope="col" className="px-1.5 py-2 print:px-0.5 print:py-1 w-[5%] print:border-r print:border-gray-400">Time</th>
              <th scope="col" className="px-1.5 py-2 print:px-0.5 print:py-1 w-[5%] print:border-r print:border-gray-400">Assgn</th>
              <th scope="col" className="px-1.5 py-2 print:px-0.5 print:py-1 w-[5%] print:border-r print:border-gray-400">Resl</th>
              <th scope="col" className="px-1.5 py-2 print:px-0.5 print:py-1 w-[5%] print:border-r print:border-gray-400">Dur.</th>
              {(canManage || isOpsForeman || isCoordinator) && <th scope="col" className="px-1.5 py-2 print:px-0.5 print:py-1 w-[7%] print:border-r print:border-gray-400">Reporter</th>}
              {(canManage || isOpsForeman || isCoordinator || user.role === Role.GUEST) && (
                <th 
                  scope="col" 
                  className="px-1.5 py-2 print:px-0.5 print:py-1 w-[5%] print:border-r print:border-gray-400 cursor-pointer hover:bg-gray-600 select-none"
                  onClick={() => handleSort('workGroup')}
                >
                    <div className="flex items-center">
                      Group
                      {sortField === 'workGroup' && (
                          <span className="ml-1 text-blue-400">
                              {sortDirection === 'asc' ? '↑' : '↓'}
                          </span>
                      )}
                    </div>
                </th>
              )}
              <th scope="col" className="px-1.5 py-2 print:px-0.5 print:py-1 w-[6%] print:border-r print:border-gray-400">Notif</th>
              <th 
                scope="col" 
                className={`px-1.5 py-2 print:px-0.5 print:py-1 w-[10%] print:border-r print:border-gray-400 ${canManage ? 'cursor-pointer hover:bg-gray-600 select-none' : ''}`}
                onClick={() => handleSort('artisan')}
              >
                  <div className="flex items-center">
                    Artisans
                    {canManage && sortField === 'artisan' && (
                        <span className="ml-1 text-blue-400">
                            {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                    )}
                  </div>
              </th>
              <th scope="col" className="px-1.5 py-2 print:px-0.5 print:py-1 w-[10%] print:border-r print:border-gray-400">Result</th>
              <th scope="col" className="px-1.5 py-2 print:px-0.5 print:py-1 w-[7%] text-center print:border-r print:border-gray-400">Resolution</th>
              {hasActions && <th scope="col" className="px-1.5 py-2 print:hidden sticky right-0 z-10 bg-inherit border-l border-gray-600 print:border-r print:border-gray-400">Actions</th>}
            </tr>
          </thead>
          <tbody className={`divide-y ${readOnly ? 'divide-gray-300 print:divide-gray-400' : 'divide-gray-700'}`}>
            {sortedReports.length === 0 && (
              <tr>
                <td colSpan={15} className="py-12 text-center text-gray-400">
                  <div className="flex flex-col items-center justify-center space-y-1">
                    <p className="text-sm font-semibold">No equipment reports found</p>
                    <p className="text-xs text-gray-500">No equipment matching this area or filter.</p>
                  </div>
                </td>
              </tr>
            )}
            {sortedReports.map((report) => {
              const dateStr = formatDate(report.reportingTime);
              const reportingTimeStr = formatTime(report.reportingTime);
              const assignmentsStr = getAssignmentText(report.assignments || []);

              const nextShiftClass = (() => {
                if (!report.isNextShift) return '';
                const color = report.nextShiftHighlightColor || 'purple';
                return `handover-highlight-${color}`;
              })();
              
              const isOwnReport = report.reporter?.id === user.id;
              const isReporterInWorkGroup = (isReporter || isOpsForeman) && report.workGroup === user.workGroup;
              const isNotCompleted = report.status !== Status.COMPLETED;
              
              const canEdit = onEdit && (
                  isAdmin || 
                  isScheduler || 
                  isCoordinator ||
                  isMaintForeman ||
                  isReporterInWorkGroup ||
                  isOwnReport
              );

              const canQuickAdjust = onUpdateReport && (
                  isAdmin ||
                  isScheduler ||
                  isMaintForeman ||
                  isCoordinator ||
                  isReporterInWorkGroup ||
                  isOwnReport
              );

              const resolutionStatusString = () => {
                if (report.resolutionStatus === 'Other' && report.resolutionNotes) {
                  let text = `Other: ${report.resolutionNotes}`;
                  if (report.resolutionEmployeeNumber) {
                    text += ` (#${report.resolutionEmployeeNumber})`;
                  }
                  return text;
                }
                return report.resolutionStatus || '-';
              };
              
              const resStatusObj = resolutionStatuses?.find(rs => rs.name === report.resolutionStatus);
              const customText = resStatusObj?.statusUrgText;
              const customColor = resStatusObj?.badgeColor;
              const showCustomBadge = customText || customColor;

              return (
                <tr key={report.id} className={`${readOnly ? '' : 'hover:bg-gray-700/50'} break-inside-avoid print:break-inside-avoid print:border-b print:border-gray-400`}>
                    <td className="px-1.5 py-1.5 print:px-0.5 print:py-0.5 whitespace-nowrap sticky left-0 z-10 bg-inherit border-r border-gray-600 shadow-sm print:border-l print:border-r print:border-gray-400">
                        <HistoryCell field="urgency" changeLog={report.changeLog} isAdmin={isAdmin}>
                            <div className="flex items-center space-x-1">
                                {showCustomBadge ? (
                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full text-white print:text-black print:border print:border-gray-400 ${customColor || 'bg-gray-600'}`}>
                                        {customText || report.status}
                                    </span>
                                ) : report.resolutionStatus === 'Temp fixed, Run but need attention' || report.resolutionStatus === 'Temp fixed, Run but need attention.' || report.resolutionStatus === 'Given to dayshift' ? (
                                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-600 text-white">
                                        Handed Over
                                    </span>
                                ) : (
                                    <Badge status={report.status} />
                                )}
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0 ${report.urgency >= 8 ? 'bg-red-600' : report.urgency >= 5 ? 'bg-yellow-500' : 'bg-green-600'} print:text-black print:bg-transparent`}>
                                    {report.urgency}
                                </div>
                            </div>
                            <div className="mt-1 print:hidden flex justify-between items-center">
                                {(isScheduler || isMaintForeman || isAdmin) && onUpdateReport && report.status !== Status.COMPLETED ? (
                                    <div className="flex flex-col space-y-1">
                                        <div className="flex items-center space-x-1">
                                            <input 
                                                type="checkbox" 
                                                checked={!!report.isNextShift} 
                                                onChange={(e) => {
                                                    const checked = e.target.checked;
                                                    onUpdateReport(report.id, { 
                                                        isNextShift: checked,
                                                        nextShiftHighlightColor: checked ? (report.nextShiftHighlightColor || 'purple') : undefined
                                                    });
                                                }} 
                                                className="w-3.5 h-3.5 text-blue-600 rounded focus:ring-blue-500 bg-gray-700 border-gray-600 cursor-pointer"
                                                title="Send to Hand Over"
                                            />
                                            <span className="text-[10px] text-gray-300 font-bold whitespace-nowrap">Next Shift</span>
                                        </div>
                                        {report.isNextShift && (
                                            <div className="flex items-center space-x-1 pl-1 pt-0.5">
                                                {/* Purple (Default) */}
                                                <button
                                                    type="button"
                                                    onClick={() => onUpdateReport(report.id, { nextShiftHighlightColor: 'purple' })}
                                                    className={`w-3 h-3 rounded-full bg-purple-600 border ${(!report.nextShiftHighlightColor || report.nextShiftHighlightColor === 'purple') ? 'border-white scale-110 shadow-sm' : 'border-transparent opacity-60 hover:opacity-100 hover:scale-110'} transition-all`}
                                                     title="handover"
                                                />
                                                {/* Red (Important) */}
                                                <button
                                                    type="button"
                                                    onClick={() => onUpdateReport(report.id, { nextShiftHighlightColor: 'red' })}
                                                    className={`w-3 h-3 rounded-full bg-red-600 border ${report.nextShiftHighlightColor === 'red' ? 'border-white scale-110 shadow-sm' : 'border-transparent opacity-60 hover:opacity-100 hover:scale-110'} transition-all`}
                                                    title="important"
                                                />
                                                {/* Orange (Less Important) */}
                                                <button
                                                    type="button"
                                                    onClick={() => onUpdateReport(report.id, { nextShiftHighlightColor: 'orange' })}
                                                    className={`w-3 h-3 rounded-full bg-amber-500 border ${report.nextShiftHighlightColor === 'orange' ? 'border-white scale-110 shadow-sm' : 'border-transparent opacity-60 hover:opacity-100 hover:scale-110'} transition-all`}
                                                    title="less important"
                                                />
                                                {/* Green (Can Wait) */}
                                                <button
                                                    type="button"
                                                    onClick={() => onUpdateReport(report.id, { nextShiftHighlightColor: 'green' })}
                                                    className={`w-3 h-3 rounded-full bg-emerald-500 border ${report.nextShiftHighlightColor === 'green' ? 'border-white scale-110 shadow-sm' : 'border-transparent opacity-60 hover:opacity-100 hover:scale-110'} transition-all`}
                                                    title="can wait"
                                                />
                                            </div>
                                        )}
                                    </div>
                                ) : <div />}
                                {onOpenComments && (
                                    <button 
                                        onClick={() => onOpenComments(report)}
                                        className={`${report.comments?.length ? 'text-blue-400 hover:text-blue-300 bg-blue-900/20 border-blue-800/30' : 'text-gray-400 hover:text-gray-300 bg-gray-900/20 border-gray-800/30'} text-[10px] flex items-center gap-1 px-1 py-0.5 rounded border ml-auto`}
                                        title="View/Add Comments"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                        </svg>
                                        {report.comments?.length ? `${report.comments.length}` : 'Chat'}
                                    </button>
                                )}
                            </div>
                        </HistoryCell>
                    </td>
                    <td className={`px-1.5 py-1.5 font-medium relative group ${readOnly ? 'text-black whitespace-normal break-words' : 'text-white max-w-[15ch] whitespace-normal break-words'} print:px-0.5 print:py-0.5 print:whitespace-normal print:break-words text-xs print:border-r print:border-gray-400 ${nextShiftClass}`}>
                        <HistoryCell field="equipment" changeLog={report.changeLog} isAdmin={isAdmin}>
                            <div className="inline-flex items-center flex-wrap">
                                {onOpenEquipmentOverview ? (
                                    <button 
                                        type="button" 
                                        onClick={() => onOpenEquipmentOverview(report)}
                                        className="text-blue-400 hover:text-blue-300 hover:underline font-bold text-left transition-colors focus:outline-none"
                                        title="Click to view equipment dashboard overview & 7-day history"
                                    >
                                        {report.equipment}
                                    </button>
                                ) : (
                                    <span>{report.equipment}</span>
                                )}
                                {report.defectImages && report.defectImages.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if ((window as any).navigateToGallery) {
                                                (window as any).navigateToGallery(report.id);
                                            }
                                        }}
                                        className="inline-flex items-center gap-0.5 text-xs text-blue-400 hover:text-blue-300 ml-1.5 font-mono cursor-pointer hover:underline focus:outline-none bg-blue-950/40 border border-blue-800/50 px-1.5 py-0.5 rounded transition"
                                        title="Click to view image in Gallery"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-camera inline-block align-middle"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
                                        <span>{report.defectImages.length}</span>
                                    </button>
                                )}
                                {report.audioNote && (
                                    <span className="inline-flex items-center text-xs text-rose-400 ml-1" title="Voice note attached">
                                        🎙️
                                    </span>
                                )}
                                {(report.source === 'field-report' || report.isFieldReport) && (
                                    <span className="inline-flex items-center text-[9px] font-extrabold uppercase tracking-tight px-1.5 py-0.2 bg-amber-950/70 border border-amber-500/40 text-amber-300 rounded ml-1" title="Submitted via Field QR Portal">
                                        QR Field
                                    </span>
                                )}
                                {report.safetyConcern && (
                                    <span className="inline-flex items-center text-[9px] font-extrabold uppercase px-1 py-0.2 bg-red-950/80 border border-red-500/50 text-red-300 rounded ml-1" title="Safety Concern Flagged">
                                        ⚠️ Safety
                                    </span>
                                )}
                            </div>
                            {<CopyButton text={report.equipment} />}
                        </HistoryCell>
                    </td>
                    <td className={`px-1.5 py-1.5 relative group ${readOnly ? 'whitespace-normal break-words' : 'max-w-[12ch] whitespace-normal break-words'} print:px-0.5 print:py-0.5 print:whitespace-normal print:break-words text-[11px] print:border-r print:border-gray-400 ${nextShiftClass}`}>
                        <HistoryCell field="equipmentNumber" changeLog={report.changeLog} isAdmin={isAdmin}>
                            {report.equipmentNumber}
                            {<CopyButton text={report.equipmentNumber} />}
                        </HistoryCell>
                    </td>
                    <td className={`px-1.5 py-1.5 relative group ${readOnly ? 'whitespace-normal break-words' : 'max-w-[12ch] whitespace-normal break-words'} print:px-0.5 print:py-0.5 print:whitespace-normal print:break-words text-[11px] border-l border-gray-700/50 print:border-r print:border-gray-400`}>
                        <div className="flex flex-col">
                            <span className="font-medium text-blue-300">{report.operatorName || '-'}</span>
                        </div>
                        {<CopyButton text={report.operatorName || ''} />}
                    </td>
                    <td className={`px-1.5 py-1.5 relative group ${readOnly ? 'whitespace-normal break-words' : 'max-w-[12rem] whitespace-normal break-words'} print:px-0.5 print:py-0.5 print:whitespace-normal print:break-words text-[11px] print:border-r print:border-gray-400 ${nextShiftClass}`}>
                        <HistoryCell field="reportedFault" changeLog={report.changeLog} isAdmin={isAdmin}>
                            <span title={report.reportedFault} className="block">
                                {wrapTextAtLength(report.reportedFault, wrapLimit).map((line, idx) => (
                                    <span key={idx} className="block whitespace-nowrap">
                                        {line}
                                    </span>
                                ))}
                            </span>
                            {<CopyButton text={report.reportedFault} />}
                        </HistoryCell>
                    </td>
                    <td className={`px-1.5 py-1.5 relative group ${readOnly ? 'whitespace-normal break-words' : 'max-w-[10rem] whitespace-normal break-words'} print:px-0.5 print:py-0.5 print:whitespace-normal print:break-words text-[11px] print:border-r print:border-gray-400`}>
                        <span title={report.details || ''} className="block">
                            {wrapTextAtLength(report.details || '-', wrapLimit).map((line, idx) => (
                                <span key={idx} className="block whitespace-nowrap">
                                    {line}
                                </span>
                            ))}
                        </span>
                    </td>
                    <td className="px-1.5 py-1.5 whitespace-nowrap relative group print:px-0.5 print:py-0.5 text-[11px] print:border-r print:border-gray-400">
                        {dateStr}
                        {<CopyButton text={dateStr} />}
                    </td>
                    <td className="px-1.5 py-1.5 whitespace-nowrap relative group print:px-0.5 print:py-0.5 text-[11px] print:border-r print:border-gray-400">
                        <QuickTimeAdjuster 
                            report={report} 
                            field="reportingTime" 
                            currentValue={report.reportingTime} 
                            onUpdate={onUpdateReport!} 
                            canEdit={canQuickAdjust} 
                        />
                        {<CopyButton text={reportingTimeStr} />}
                    </td>
                    <td className="px-1.5 py-1.5 whitespace-nowrap relative group print:px-0.5 print:py-0.5 text-[11px] print:border-r print:border-gray-400">
                        <QuickTimeAdjuster 
                            report={report} 
                            field="assignedTime" 
                            currentValue={report.assignedTime} 
                            onUpdate={onUpdateReport!} 
                            canEdit={canQuickAdjust} 
                        />
                    </td>
                    <td className="px-1.5 py-1.5 whitespace-nowrap relative group print:px-0.5 print:py-0.5 text-[11px] print:border-r print:border-gray-400">
                         <QuickTimeAdjuster 
                            report={report} 
                            field="resolutionTime" 
                            currentValue={report.resolutionTime} 
                            onUpdate={onUpdateReport!} 
                            canEdit={canQuickAdjust} 
                        />
                    </td>
                    <td className="px-1.5 py-1.5 whitespace-nowrap font-mono text-[10px] text-blue-400 print:px-0.5 print:py-0.5 print:border-r print:border-gray-400">
                        {calculateDuration(report.reportingTime, report.resolutionTime)}
                    </td>
                    {(canManage || isCoordinator) && (
                        <td className="px-1.5 py-1.5 relative group print:px-0.5 print:py-0.5 print:whitespace-normal print:break-words text-[11px] print:border-r print:border-gray-400">
                           <div className="flex flex-col">
                                <span className="font-medium">{report.reporter?.name}</span>
                                {report.reporter?.employeeNumber && (
                                    <span className={`text-[9px] ${readOnly ? 'text-gray-600' : 'text-gray-400'} print:text-black`}>
                                        #{report.reporter.employeeNumber}
                                    </span>
                                )}
                           </div>
                        </td>
                    )}
                     {(canManage || isOpsForeman || isCoordinator || user.role === Role.GUEST) && (
                        <td className={`px-1.5 py-1.5 relative group print:px-0.5 print:py-0.5 print:whitespace-normal print:break-words text-[11px] print:border-r print:border-gray-400`}>
                            {report.workGroup}
                            {<CopyButton text={report.workGroup} />}
                        </td>
                    )}
                    <td className={`px-1.5 py-1.5 relative group print:px-0.5 print:py-0.5 print:whitespace-normal print:break-words text-[11px] print:border-r print:border-gray-400`}>
                        <HistoryCell field="notificationNumber" changeLog={report.changeLog} isAdmin={isAdmin}>
                            {report.notificationNumber || '-'}
                            {<CopyButton text={report.notificationNumber || ''} />}
                        </HistoryCell>
                    </td>
                    <td className={`px-1.5 py-1.5 relative group print:px-0.5 print:py-0.5 print:border-r print:border-gray-400`}>
                        <HistoryCell field="assignments" changeLog={report.changeLog} isAdmin={isAdmin}>
                            {report.assignments && report.assignments.length > 0 ? (
                                <div className="flex flex-col text-[10px] space-y-0.5 print:space-y-0">
                                    {report.assignments.map((a, idx) => (
                                        <div key={`${a.artisanId}-${idx}`} className={`${readOnly ? 'print:p-0 print:border-0 print:bg-transparent' : 'bg-gray-700/50 p-0.5 mb-0.5'} rounded border border-gray-700/50`}>
                                            <button 
                                              type="button"
                                              onClick={() => onFilterArtisan && onFilterArtisan(a.artisanId, a.artisanName)}
                                              className={`font-bold text-left hover:text-blue-400 transition-colors ${canManage && onFilterArtisan ? 'cursor-pointer' : 'cursor-default pointer-events-none'}`}
                                            >
                                              {a.artisanName}
                                            </button>
                                            <div className="text-[9px] text-gray-400">
                                                {a.specialty || a.responsibility} 
                                                {a.employeeNumber ? ` (#${a.employeeNumber})` : ''}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : '-'}
                            {<CopyButton text={assignmentsStr} />}
                        </HistoryCell>
                    </td>
                    <td className={`px-1.5 py-1.5 relative group ${readOnly ? 'whitespace-normal break-words' : 'max-w-[12rem] whitespace-normal break-words'} print:px-0.5 print:py-0.5 print:whitespace-normal print:break-words text-[11px] print:border-r print:border-gray-400`}>
                        <HistoryCell field="whatWasWrong" changeLog={report.changeLog} isAdmin={isAdmin}>
                            {report.whatWasWrong ? <ExpandableText text={report.whatWasWrong} wrapLimit={wrapLimit} /> : '-'}
                            {<CopyButton text={report.whatWasWrong || ''} />}
                        </HistoryCell>
                    </td>
                    <td className={`px-1.5 py-1.5 relative group whitespace-normal break-words max-w-[12rem] print:px-0.5 print:py-0.5 print:whitespace-normal print:break-words text-[11px] print:border-r print:border-gray-400`}>
                        <HistoryCell field="resolutionStatus" changeLog={report.changeLog} isAdmin={isAdmin}>
                            <div>
                                <span title={resolutionStatusString()} className="block">
                                    {wrapTextAtLength(resolutionStatusString(), wrapLimit).map((line, idx) => (
                                        <span key={idx} className="block whitespace-nowrap">
                                            {line}
                                        </span>
                                    ))}
                                </span>
                                {(report.resolutionStatus === 'Given to dayshift' || report.resolutionStatus === 'Hand Over' || report.isNextShift) && (
                                    <div className="mt-1 space-y-1">
                                        {(report.handoverSection || report.handoverRecipientName) && (
                                            <div className="text-[10px] text-gray-400">
                                                {report.handoverSection && <div>Sec: <span className="text-purple-400 font-semibold">{report.handoverSection}</span></div>}
                                                {report.handoverRecipientName && <div>Recip: <span className="text-blue-300 font-medium">{report.handoverRecipientName}</span></div>}
                                            </div>
                                        )}
                                        {report.handbackNotes && (
                                            <div className="text-[9px] text-amber-300/90 bg-amber-950/30 border border-amber-700/40 rounded px-1 py-0.5 leading-tight" title={report.handbackNotes}>
                                                Note: {report.handbackNotes}
                                            </div>
                                        )}
                                        {report.handoverSafetyVerified && (
                                            <span className="inline-block bg-emerald-950/60 text-emerald-300 border border-emerald-700/50 px-1 py-0.5 rounded text-[8px] font-bold mr-1" title="Padlocks removed & safety verified for handover">
                                                ✓ SAFETY VERIFIED
                                            </span>
                                        )}
                                        {report.dayshiftAcknowledged ? (
                                            <div className="space-y-0.5">
                                                <span title={`Acknowledged by ${report.dayshiftAcknowledgedBy || 'Unknown'} at ${report.dayshiftAcknowledgedAt ? formatDate(report.dayshiftAcknowledgedAt) + ' ' + formatTime(report.dayshiftAcknowledgedAt) : 'Unknown time'}`} className="inline-block bg-green-900/50 text-green-300 border border-green-700/50 px-1.5 py-0.5 rounded text-[9px] font-bold">
                                                    ACK BY {(report.dayshiftAcknowledgedBy || 'DAYSHIFT').toUpperCase()}
                                                </span>
                                                {report.dayshiftAcknowledgedAt && (
                                                    <span className="block text-[8px] text-gray-400">
                                                        {formatDate(report.dayshiftAcknowledgedAt)} {formatTime(report.dayshiftAcknowledgedAt)}
                                                    </span>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="inline-block bg-red-900/50 text-red-300 border border-red-700/50 px-1.5 py-0.5 rounded text-[9px] font-bold animate-pulse">PENDING ACK</span>
                                        )}
                                    </div>
                                )}
                                {report.resolutionEmployeeNumber && (
                                    <span className={`block text-[10px] ${readOnly ? 'text-gray-600' : 'text-gray-400'} italic print:text-black mt-0.5`}>
                                        By: #{report.resolutionEmployeeNumber}
                                    </span>
                                )}
                            </div>
                            {<CopyButton text={resolutionStatusString()} />}
                        </HistoryCell>
                    </td>
                    {hasActions && (
                    <td className="px-1.5 py-1.5 print:hidden sticky right-0 z-10 bg-inherit border-l border-gray-600 shadow-sm print:border-r print:border-gray-400">
                    <div className="flex flex-wrap items-center gap-1">
                        {(canAcknowledgeDayShift || report.handoverRecipientId === user.id || (report.handoverRecipientName && report.handoverRecipientName.trim().toLowerCase() === user.name.trim().toLowerCase())) && (report.resolutionStatus === 'Given to dayshift' || report.resolutionStatus === 'Hand Over' || report.isNextShift) && !report.dayshiftAcknowledged && onUpdateReport && (
                            <button onClick={() => {
                                onUpdateReport(report.id, {
                                    dayshiftAcknowledged: true,
                                    dayshiftAcknowledgedBy: user.name,
                                    dayshiftAcknowledgedAt: new Date().toISOString()
                                });
                            }} className="bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-bold py-0.5 px-1.5 rounded border border-purple-500/50 shadow-sm" title="Acknowledge receipt of handover">Ack</button>
                        )}
                        {report.status === Status.DRAFT && onUpdateReport && (
                            <button 
                                onClick={() => {
                                    onUpdateReport(report.id, {
                                        status: Status.ACTIVE,
                                        isDraft: false,
                                        changeLog: [
                                            ...(report.changeLog || []),
                                            {
                                                field: 'status',
                                                oldValue: Status.DRAFT,
                                                newValue: Status.ACTIVE,
                                                timestamp: new Date().toISOString(),
                                                changedBy: user.name
                                            }
                                        ]
                                    });
                                }} 
                                className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-extrabold py-0.5 px-2 rounded shadow flex items-center gap-1 animate-pulse"
                                title="Approve & submit draft to active breakdown"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                                Submit
                            </button>
                        )}
                        {canManage && report.status === Status.ACTIVE && onAssign && (
                            <button onClick={() => onAssign(report)} className="text-blue-400 hover:text-blue-300 font-semibold text-[10px] bg-blue-900/20 px-1 rounded border border-blue-800/30">Assign</button>
                        )}
                        {(canManage || isReporterInWorkGroup || isOwnReport) && report.status === Status.ASSIGNED && onResolve && (
                            <button onClick={() => onResolve(report)} className="text-yellow-400 hover:text-yellow-300 font-semibold text-[10px] bg-yellow-900/20 px-1 rounded border border-yellow-800/30">Resolve</button>
                        )}
                        {(isReporterInWorkGroup || isAdmin || ((isMaintForeman || isOpsForeman) && isOwnReport)) && report.status === Status.RESOLVED && onComplete && (
                        <button onClick={() => onComplete(report)} className="bg-green-600 hover:bg-green-700 text-white text-[10px] font-bold py-0.5 px-1.5 rounded shadow-sm">Complete</button>
                        )}
                        {onEdit && (
                            <button 
                                onClick={() => onEdit(report)} 
                                className={`font-semibold text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
                                    canEdit 
                                        ? 'text-indigo-400 hover:text-indigo-300 bg-indigo-900/20 border-indigo-800/30' 
                                        : 'text-gray-400 hover:text-gray-300 bg-gray-900/20 border-gray-800/30'
                                }`}
                            >
                                {canEdit ? 'Edit' : 'View'}
                            </button>
                        )}
                        {(isReporter || isReporterInWorkGroup || isOwnReport || isAdmin || isScheduler) && !report.resolutionTime && report.status !== Status.COMPLETED && report.status !== Status.RESOLVED && onUpdateReport && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onUpdateReport(report.id, {
                                        resolutionTime: new Date().toISOString()
                                    });
                                }}
                                className="bg-teal-600 hover:bg-teal-500 active:scale-95 text-white text-[10px] font-bold py-0.5 px-2 rounded shadow transition-all duration-150 whitespace-nowrap flex items-center gap-1"
                                title="Mark equipment back in production to stop downtime (records resolution time)"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                </svg>
                                Back in Production
                            </button>
                        )}
                        {(isReporter || isReporterInWorkGroup || isOwnReport || isAdmin || isScheduler) && report.resolutionTime && report.status !== Status.COMPLETED && report.status !== Status.RESOLVED && (
                            <span 
                                className="text-[9px] text-teal-400 font-bold px-1.5 py-0.5 bg-teal-950/60 rounded border border-teal-700/50 whitespace-nowrap flex items-center gap-1"
                                title={`Back in production since ${formatTime(report.resolutionTime)}`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                                In Prod ✓
                            </span>
                        )}
                        {onReportAgain && (
                            <button 
                              onClick={() => onReportAgain(report.id)} 
                              title="Report this fault again"
                              className="bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold py-0.5 px-1.5 rounded flex items-center gap-0.5 shadow-sm transition"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                              Again
                            </button>
                        )}
                        {(isAdmin || ((isReporter || isScheduler) && isOwnReport)) && onDelete && (
                            <button onClick={() => {
                            if (window.confirm('Are you sure you want to delete this report permanently?')) {
                                onDelete(report.id);
                            }
                            }} className="bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold py-0.5 px-1.5 rounded">Del</button>
                        )}
                    </div>
                    </td>
                    )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BreakdownTable;
