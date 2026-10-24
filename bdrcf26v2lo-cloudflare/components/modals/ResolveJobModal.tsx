import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import { ResolutionStatus, HandoverSection, User, Role } from '../../types';
import { sanitizeInput } from '../../utils';

interface ResolveJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  resolutionStatuses: { id: string, name: string }[];
  sections?: HandoverSection[];
  users?: User[];
  onSubmit: (data: { 
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
    dayshiftAcknowledged?: boolean,
  }) => void;
}

const DEFAULT_HANDOVER_SECTIONS: HandoverSection[] = [
  { id: 'sec-mech', name: 'Mechanical', targetRole: Role.MECH_SUPERVISOR },
  { id: 'sec-elec', name: 'Electrical', targetRole: Role.ELEC_SUPERVISOR },
  { id: 'sec-tech', name: 'Technicians', targetRole: Role.TECH_SUPERVISOR },
  { id: 'sec-inst', name: 'Instrumentation', targetRole: Role.INST_SUPERVISOR },
  { id: 'sec-ops', name: 'Operations', targetRole: Role.OPS_FOREMAN },
  { id: 'sec-serv', name: 'Services' },
];

const ResolveJobModal: React.FC<ResolveJobModalProps> = ({ 
  isOpen, 
  onClose, 
  resolutionStatuses, 
  sections = [], 
  users = [], 
  onSubmit 
}) => {
  const [whatWasWrong, setWhatWasWrong] = useState('');
  const [resolutionStatus, setResolutionStatus] = useState<ResolutionStatus>('');
  const [resolutionTime, setResolutionTime] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolutionEmployeeNumber, setResolutionEmployeeNumber] = useState('');
  
  const [handoverSection, setHandoverSection] = useState('');
  const [handoverRecipientId, setHandoverRecipientId] = useState('');
  const [handoverRecipientName, setHandoverRecipientName] = useState('');
  const [handbackNotes, setHandbackNotes] = useState('');
  const [handoverSafetyVerified, setHandoverSafetyVerified] = useState(false);
  const [isRecipientDropdownOpen, setIsRecipientDropdownOpen] = useState(false);

  const availableSections = React.useMemo(() => {
    const map = new Map<string, HandoverSection>();
    DEFAULT_HANDOVER_SECTIONS.forEach(s => map.set(s.name.toLowerCase(), s));
    sections.forEach(s => map.set(s.name.toLowerCase(), s));
    return Array.from(map.values());
  }, [sections]);

  const isHandoverSelected = resolutionStatus === 'Hand Over' || resolutionStatus === 'Given to dayshift';

  useEffect(() => {
    if (isOpen) {
        setWhatWasWrong('');
        setResolutionStatus('');
        setResolutionNotes('');
        setResolutionEmployeeNumber('');
        setHandoverSection(availableSections.length > 0 ? availableSections[0].name : 'Mechanical');
        setHandoverRecipientId('');
        setHandoverRecipientName('');
        setHandbackNotes('');
        setHandoverSafetyVerified(false);
        setIsRecipientDropdownOpen(false);
        const now = new Date();
        // Adjust to local timezone for datetime-local input
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        setResolutionTime(now.toISOString().slice(0, 16));
    }
  }, [isOpen, availableSections]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!whatWasWrong) {
      alert('Please describe what was wrong.');
      return;
    }
    if (!resolutionStatus) {
      alert('Please select a resolution status.');
      return;
    }
    if (!resolutionTime) {
        alert('Please select a resolution time.');
        return;
    }
    const dateObj = new Date(resolutionTime);

    const sanitizedWhat = sanitizeInput(whatWasWrong, 500);
    const sanitizedNotes = sanitizeInput(resolutionNotes, 500);
    const sanitizedEmp = sanitizeInput(resolutionEmployeeNumber, 20);
    const sanitizedRecipientName = sanitizeInput(handoverRecipientName, 100);
    const sanitizedHandbackNotes = sanitizeInput(handbackNotes, 500);

    const data: {
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
    } = { 
        whatWasWrong: sanitizedWhat, 
        resolutionStatus, 
        resolutionTime: dateObj.toISOString() 
    };

    if (resolutionStatus === 'Other') {
        if (!sanitizedNotes.trim()) {
            alert('Please provide a description for the "Other" resolution status.');
            return;
        }
        data.resolutionNotes = sanitizedNotes.trim();
        data.resolutionEmployeeNumber = sanitizedEmp.trim() || undefined;
    } else if (isHandoverSelected) {
        if (!handoverSection) {
            alert('Please select a handover section / discipline.');
            return;
        }
        if (!sanitizedRecipientName.trim()) {
            alert('Please select or type who should acknowledge the handover.');
            return;
        }
        const recipient = users.find(u => u.id === handoverRecipientId) || users.find(u => u.name.toLowerCase() === sanitizedRecipientName.toLowerCase());
        data.handoverSection = handoverSection;
        data.handoverRecipientId = recipient ? recipient.id : (handoverRecipientId || 'custom');
        data.handoverRecipientName = recipient ? recipient.name : sanitizedRecipientName;
        data.handbackNotes = sanitizedHandbackNotes.trim() || undefined;
        data.handoverSafetyVerified = handoverSafetyVerified;
        data.dayshiftAcknowledged = false;
    } else {
        // Clear notes if status is not 'Other' to ensure clean data
        data.resolutionNotes = ''; 
        data.resolutionEmployeeNumber = '';
    }

    onSubmit(data);
    // Reset form
    setWhatWasWrong('');
  };

  const selectedSecObj = availableSections.find(s => s.name === handoverSection);
  const targetRoleForSection = selectedSecObj?.targetRole;

  const filteredCandidates = users.filter(u => {
    if (u.id === 'guest' || u.role === 'Guest') return false;
    if (targetRoleForSection) {
      if (u.roles && u.roles.length > 0) {
        return u.roles.includes(targetRoleForSection);
      }
      return u.role === targetRoleForSection;
    }
    return true;
  });

  const hasSpecificFilter = !!targetRoleForSection;
  const noMatchesForFilter = hasSpecificFilter && filteredCandidates.length === 0;

  const recipientCandidates = noMatchesForFilter
    ? users.filter(u => u.id !== 'guest' && u.role !== 'Guest')
    : filteredCandidates;

  const matchingUsers = recipientCandidates.filter(u => {
    if (!handoverRecipientName.trim()) return true;
    const q = handoverRecipientName.toLowerCase().trim();
    return u.name.toLowerCase().includes(q) || 
           (u.role && u.role.toLowerCase().includes(q)) || 
           (u.employeeNumber && u.employeeNumber.toLowerCase().includes(q));
  });

  useEffect(() => {
    setHandoverRecipientId('');
    setHandoverRecipientName('');
    setIsRecipientDropdownOpen(false);
  }, [handoverSection]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Resolve Job">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="whatWasWrong" className="block text-sm font-medium text-gray-300">What was wrong? (Short Description)</label>
          <textarea id="whatWasWrong" value={whatWasWrong} onChange={(e) => setWhatWasWrong(e.target.value)} rows={3} className="mt-1 w-full bg-gray-700 border border-gray-600 text-white rounded-md p-2" required></textarea>
        </div>
        <div>
          <label htmlFor="resolutionStatus" className="block text-sm font-medium text-gray-300">Resolution Status</label>
          <select id="resolutionStatus" value={resolutionStatus} onChange={(e) => setResolutionStatus(e.target.value as ResolutionStatus)} className="mt-1 w-full bg-gray-700 border border-gray-600 text-white rounded-md p-2" required>
            <option value="">-- Select Resolution Status --</option>
            {resolutionStatuses.map(status => <option key={status.id} value={status.name}>{status.name}</option>)}
          </select>
        </div>

        {isHandoverSelected && (
          <div className="bg-purple-950/20 p-4 rounded-md border border-purple-700/50 space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-purple-800/40 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-300">Shift Handover Initiation</span>
              <span className="text-[10px] text-purple-400 bg-purple-900/40 px-2 py-0.5 rounded border border-purple-700/50">Requires Day Shift Ack</span>
            </div>
            <div>
              <label htmlFor="handoverSection" className="block text-sm font-medium text-gray-300">
                Handover Section / Discipline <span className="text-red-500">*</span>
              </label>
              <select 
                id="handoverSection" 
                value={handoverSection} 
                onChange={(e) => setHandoverSection(e.target.value)} 
                className="mt-1 w-full bg-gray-700 border border-gray-600 text-white rounded-md p-2" 
                required
              >
                <option value="">-- Select Section / Discipline --</option>
                {availableSections.map(sec => <option key={sec.id} value={sec.name}>{sec.name}</option>)}
              </select>
            </div>
            <div className="relative">
              <label htmlFor="handoverRecipient" className="block text-sm font-medium text-gray-300 flex justify-between items-center mb-1">
                <span>Handover Recipient (Supervisor / Lead) <span className="text-red-500">*</span></span>
                {targetRoleForSection && (
                  <span className="text-[10px] text-blue-400 font-semibold bg-blue-900/40 px-1.5 py-0.5 rounded border border-blue-800">
                    Role: {targetRoleForSection}
                  </span>
                )}
              </label>

              <div className="relative">
                <input 
                  type="text"
                  id="handoverRecipient"
                  value={handoverRecipientName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setHandoverRecipientName(val);
                    setIsRecipientDropdownOpen(true);
                    const match = recipientCandidates.find(u => u.name.toLowerCase() === val.trim().toLowerCase());
                    if (match) {
                      setHandoverRecipientId(match.id);
                    } else {
                      setHandoverRecipientId('');
                    }
                  }}
                  onFocus={() => setIsRecipientDropdownOpen(true)}
                  placeholder="Type recipient name or select from list..."
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-md p-2 pr-16 text-sm focus:outline-none focus:border-blue-500"
                  required
                  autoComplete="off"
                />

                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1 z-10">
                  {handoverRecipientName && (
                    <button
                      type="button"
                      onClick={() => {
                        setHandoverRecipientName('');
                        setHandoverRecipientId('');
                        setIsRecipientDropdownOpen(true);
                      }}
                      className="text-gray-400 hover:text-white p-1 text-xs"
                      title="Clear"
                    >
                      ✕
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsRecipientDropdownOpen(!isRecipientDropdownOpen)}
                    className="text-gray-400 hover:text-white p-1"
                    title="Toggle list"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform ${isRecipientDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>

                {isRecipientDropdownOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setIsRecipientDropdownOpen(false)} 
                    />
                    <div className="absolute left-0 right-0 mt-1 bg-gray-800 border border-gray-600 rounded-md shadow-2xl max-h-48 overflow-y-auto z-50 divide-y divide-gray-700/60">
                      {matchingUsers.length > 0 ? (
                        matchingUsers.map(u => (
                          <div
                            key={u.id}
                            onClick={() => {
                              setHandoverRecipientName(u.name);
                              setHandoverRecipientId(u.id);
                              setIsRecipientDropdownOpen(false);
                            }}
                            className={`px-3 py-2 text-xs cursor-pointer hover:bg-gray-700/80 flex items-center justify-between transition ${
                              handoverRecipientId === u.id ? 'bg-blue-900/50 text-blue-200 font-semibold' : 'text-gray-200'
                            }`}
                          >
                            <div>
                              <span className="font-medium text-white">{u.name}</span>
                              {u.employeeNumber && <span className="text-[10px] text-gray-400 ml-1.5">(#{u.employeeNumber})</span>}
                            </div>
                            <span className="text-[10px] text-blue-300 bg-gray-900 px-1.5 py-0.5 rounded border border-gray-700">
                              {u.role}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-xs text-gray-400 italic">
                          No registered user found matching "{handoverRecipientName}". You can submit this as a custom name.
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {noMatchesForFilter && (
                <p className="text-[10px] text-amber-400 italic mt-1">
                  Showing all users because no active team members are currently assigned the "{targetRoleForSection}" role.
                </p>
              )}
            </div>

            <div>
              <label htmlFor="handbackNotes" className="block text-sm font-medium text-gray-300">
                Handback & Remaining Advisory Notes
              </label>
              <textarea
                id="handbackNotes"
                value={handbackNotes}
                onChange={(e) => setHandbackNotes(e.target.value)}
                rows={2}
                placeholder="Record remaining work, required spares, isolation status, or safety advisories for the incoming shift..."
                className="mt-1 w-full bg-gray-700 border border-gray-600 text-white rounded-md p-2 text-xs"
              />
            </div>

            <label className="flex items-start gap-2.5 p-2.5 rounded-md bg-gray-800/80 border border-gray-700 cursor-pointer hover:border-emerald-600/60 transition">
              <input
                type="checkbox"
                checked={handoverSafetyVerified}
                onChange={(e) => setHandoverSafetyVerified(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-600 text-emerald-600 focus:ring-emerald-500 bg-gray-700"
              />
              <span className="text-xs text-gray-200 leading-snug">
                <strong className="text-emerald-400 block">Safety & Handback Verification</strong>
                Confirm personal lockout padlocks have been removed (or transferred to shift lockbox) and equipment safety status is verified for handover.
              </span>
            </label>
          </div>
        )}

        {resolutionStatus === 'Other' && (
            <div className="bg-gray-900/50 p-4 rounded-md border border-gray-700 space-y-4">
                 <div>
                    <label htmlFor="resolutionNotes" className="block text-sm font-medium text-gray-300">
                        Description for 'Other' status <span className="text-red-500">*</span>
                    </label>
                    <textarea 
                        id="resolutionNotes" 
                        value={resolutionNotes} 
                        onChange={(e) => setResolutionNotes(e.target.value)} 
                        rows={2} 
                        className="mt-1 w-full bg-gray-700 border border-gray-600 text-white rounded-md p-2" 
                        required
                    ></textarea>
                </div>
                <div>
                    <label htmlFor="resolutionEmployeeNumber" className="block text-sm font-medium text-gray-300">
                        Employee Number (Optional)
                    </label>
                    <input 
                        type="text"
                        id="resolutionEmployeeNumber" 
                        value={resolutionEmployeeNumber} 
                        onChange={(e) => setResolutionEmployeeNumber(e.target.value)} 
                        className="mt-1 w-full bg-gray-700 border border-gray-600 text-white rounded-md p-2"
                        placeholder="Enter number if applicable"
                    />
                </div>
            </div>
        )}

        <div>
          <label htmlFor="resolutionTime" className="block text-sm font-medium text-gray-300">Resolution Time</label>
          <input
            type="datetime-local"
            id="resolutionTime"
            value={resolutionTime}
            onChange={(e) => setResolutionTime(e.target.value)}
            className="mt-1 w-full bg-gray-700 border border-gray-600 text-white rounded-md p-2"
            required
          />
        </div>
        <div className="flex justify-end pt-4 space-x-2">
          <button type="button" onClick={onClose} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md">Cancel</button>
          <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md">Mark as Resolved</button>
        </div>
      </form>
    </Modal>
  );
};

export default ResolveJobModal;
