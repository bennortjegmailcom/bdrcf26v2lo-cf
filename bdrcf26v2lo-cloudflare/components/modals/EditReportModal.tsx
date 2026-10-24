import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import { BreakdownReport, User, Role, Status, Assignment, Responsibility, Artisan, ResolutionStatus, HandoverSection } from '../../types';
import { compressImage } from '../../utils';
import CanvasAnnotator from '../ui/CanvasAnnotator';
import { Upload, X, Edit2, CheckCircle2, AlertTriangle } from 'lucide-react';


interface EditReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: BreakdownReport | null;
  onSubmit: (reportId: string, updates: Partial<BreakdownReport>) => void;
  currentUser: User;
  artisans?: Artisan[];
  resolutionStatuses: { id: string, name: string }[];
  sections?: HandoverSection[];
  users?: User[];
}

const CopyButton = ({ text }: { text: string }) => {
    const [copied, setCopied] = useState(false);
  
    const handleCopy = (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      if (!text) return;
  
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }).catch(err => console.error('Failed to copy:', err));
    };
  
    return (
      <button
        onClick={handleCopy}
        className="ml-2 text-gray-400 hover:text-white p-1 rounded hover:bg-gray-600 transition-colors"
        title="Copy to clipboard"
      >
        {copied ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
          </svg>
        )}
      </button>
    );
  };

const EditReportModal: React.FC<EditReportModalProps> = ({ 
  isOpen, 
  onClose, 
  report, 
  onSubmit, 
  currentUser, 
  artisans = [], 
  resolutionStatuses,
  sections = [],
  users = []
}) => {
  // Reporter Fields
  const [equipment, setEquipment] = useState('');
  const [equipmentNumber, setEquipmentNumber] = useState('');
  const [reportedFault, setReportedFault] = useState('');
  const [details, setDetails] = useState('');
  const [operatorName, setOperatorName] = useState('');
  const [urgency, setUrgency] = useState(5);
  const [reportingTime, setReportingTime] = useState('');
  
  // Scheduler/Coordinator Fields
  const [notificationNumber, setNotificationNumber] = useState('');
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [assignedTime, setAssignedTime] = useState('');
  const [whatWasWrong, setWhatWasWrong] = useState('');
  const [resolutionStatus, setResolutionStatus] = useState<ResolutionStatus>('');
  const [resolutionTime, setResolutionTime] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolutionEmployeeNumber, setResolutionEmployeeNumber] = useState('');

  const [responsibility, setResponsibility] = useState<Responsibility | ''>('');

  // Handover-specific Fields
  const [handoverSection, setHandoverSection] = useState('');
  const [handoverRecipientId, setHandoverRecipientId] = useState('');
  const [handoverRecipientName, setHandoverRecipientName] = useState('');
  const [handbackNotes, setHandbackNotes] = useState('');
  const [handoverSafetyVerified, setHandoverSafetyVerified] = useState(false);
  const [isRecipientDropdownOpen, setIsRecipientDropdownOpen] = useState(false);

  const availableSections = React.useMemo(() => {
    const defaults: HandoverSection[] = [
      { id: 'sec-mech', name: 'Mechanical', targetRole: Role.MECH_SUPERVISOR },
      { id: 'sec-elec', name: 'Electrical', targetRole: Role.ELEC_SUPERVISOR },
      { id: 'sec-tech', name: 'Technicians', targetRole: Role.TECH_SUPERVISOR },
      { id: 'sec-inst', name: 'Instrumentation', targetRole: Role.INST_SUPERVISOR },
      { id: 'sec-ops', name: 'Operations', targetRole: Role.OPS_FOREMAN },
      { id: 'sec-serv', name: 'Services' },
    ];
    const map = new Map<string, HandoverSection>();
    defaults.forEach(s => map.set(s.name.toLowerCase(), s));
    sections.forEach(s => map.set(s.name.toLowerCase(), s));
    return Array.from(map.values());
  }, [sections]);

  const isHandoverSelected = resolutionStatus === 'Hand Over' || resolutionStatus === 'Given to dayshift';

  const [defectImages, setDefectImages] = useState<string[]>([]);
  const [annotatingIndex, setAnnotatingIndex] = useState<number | null>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const base64Promises = Array.from(files).map(async (file) => {
      try {
        const compressed = await compressImage(file as File);
        return compressed;
      } catch (err) {
        console.error("Image compression failed:", err);
        return null;
      }
    });

    const results = await Promise.all(base64Promises);
    const validResults = results.filter((res): res is string => res !== null);
    setDefectImages((prev) => [...prev, ...validResults]);
  };

  const removeImage = (index: number) => {
    setDefectImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveAnnotation = (annotatedBase64: string) => {
    if (annotatingIndex !== null) {
      setDefectImages((prev) => {
        const updated = [...prev];
        updated[annotatingIndex] = annotatedBase64;
        return updated;
      });
      setAnnotatingIndex(null);
    }
  };


  const toInputDate = (isoString?: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return date.toISOString().slice(0, 16);
  };

  useEffect(() => {
    if (report) {
      setEquipment(report.equipment);
      setEquipmentNumber(report.equipmentNumber);
      setReportedFault(report.reportedFault);
      setDetails(report.details || '');
      setOperatorName(report.operatorName || '');
      setUrgency(report.urgency);
      setResponsibility(report.responsibility || '');
      setReportingTime(toInputDate(report.reportingTime));
      
      setNotificationNumber(report.notificationNumber || '');
      setAssignments(report.assignments || []);
      setAssignedTime(toInputDate(report.assignedTime));
      
      setWhatWasWrong(report.whatWasWrong || '');
      setResolutionStatus(report.resolutionStatus || '');
      setResolutionTime(toInputDate(report.resolutionTime));
      setResolutionNotes(report.resolutionNotes || '');
      setResolutionEmployeeNumber(report.resolutionEmployeeNumber || '');

      setHandoverSection(report.handoverSection || (availableSections.length > 0 ? availableSections[0].name : 'Mechanical'));
      setHandoverRecipientId(report.handoverRecipientId || '');
      setHandoverRecipientName(report.handoverRecipientName || '');
      setHandbackNotes(report.handbackNotes || '');
      setHandoverSafetyVerified(!!report.handoverSafetyVerified);
      setIsRecipientDropdownOpen(false);

      setDefectImages(report.defectImages || []);
      setAnnotatingIndex(null);
    }
  }, [report?.id]);

  const handleAssignmentChange = (index: number, field: keyof Assignment, value: string) => {
    const newAssignments = [...assignments];
    const assignment = { ...newAssignments[index] };
    
    if (field === 'responsibility') {
      assignment.responsibility = value as Responsibility;
      // Reset name/id when trade changes
      assignment.artisanId = '';
      assignment.artisanName = '';
      assignment.employeeNumber = '';
      assignment.specialty = '';
    } else if (field === 'artisanId') {
      assignment.artisanId = value;
      const selectedArtisan = artisans.find(a => a.id === value);
      if (selectedArtisan) {
        assignment.artisanName = selectedArtisan.name;
        assignment.employeeNumber = ''; // Registered artisans don't need manual EMP# here
        assignment.specialty = '';
      }
    } else {
        // Manual fields: artisanName, employeeNumber, specialty
        (assignment as any)[field] = value;
    }
    
    newAssignments[index] = assignment;
    setAssignments(newAssignments);
  };

  const addAssignment = () => {
    setAssignments([
      ...assignments, 
      { 
        artisanId: '', 
        artisanName: '',
        responsibility: Responsibility.FITTER 
      }
    ]);
  };

  const removeAssignment = (index: number) => {
    const newAssignments = assignments.filter((_, i) => i !== index);
    setAssignments(newAssignments);
  };

  const isReporterInWorkGroup = (currentUser.role === Role.REPORTER || currentUser.role === Role.OPS_FOREMAN) && report?.workGroup === currentUser.workGroup;
  const isAdmin = currentUser.role === Role.ADMIN;
  const isScheduler = currentUser.role === Role.SCHEDULER;
  const isCoordinator = currentUser.role === Role.COORDINATOR;
  const isMaintForeman = currentUser.role === Role.FOREMAN;
  const isOpsForeman = currentUser.role === Role.OPS_FOREMAN;
  const isSupervisor = currentUser.role === Role.MECH_SUPERVISOR || currentUser.role === Role.ELEC_SUPERVISOR || currentUser.role === Role.TECH_SUPERVISOR || currentUser.role === Role.INST_SUPERVISOR;
  const isReporter = currentUser.role === Role.REPORTER;
  
  const isOwnReport = report?.reporter?.id === currentUser.id;
  
  const canEditBasicInfo = isAdmin || isScheduler || isSupervisor || isReporterInWorkGroup || isOwnReport;
  const canEditBookings = isAdmin || isScheduler || isSupervisor || isMaintForeman || isOwnReport;
  const canEditResolution = isAdmin || isScheduler || isSupervisor || isMaintForeman || isCoordinator || isReporter || isReporterInWorkGroup || isOwnReport;

  const handleSubmit = (e: React.FormEvent, forceStatus?: Status) => {
    e.preventDefault();
    if (!report) return;

    const updates: Partial<BreakdownReport> = {};

    if (forceStatus) {
      updates.status = forceStatus;
      if (forceStatus === Status.ACTIVE) {
        updates.isDraft = false;
        const verificationLog = {
          field: 'status',
          oldValue: report.status || Status.DRAFT,
          newValue: Status.ACTIVE,
          timestamp: new Date().toISOString(),
          changedBy: `${currentUser.name} (Reporter Verified)`
        };
        updates.changeLog = [...(report.changeLog || []), verificationLog];
      }
    }

    if (canEditBasicInfo || report.status === Status.DRAFT) {
        updates.equipment = equipment;
        updates.equipmentNumber = equipmentNumber;
        updates.reportedFault = reportedFault;
        updates.details = details;
        updates.operatorName = operatorName.trim() || null;
        updates.urgency = urgency;
        updates.responsibility = responsibility || undefined;
        if (reportingTime) updates.reportingTime = new Date(reportingTime).toISOString();
        updates.defectImages = defectImages;
    }

    if (canEditBookings) {
        // Validation for assignments
        for (const assig of assignments) {
            const filtered = artisans.filter(a => a.responsibility === assig.responsibility);
            // Allow manual if filtered exists BUT the current assignment is explicitly 'manual'
            const isManual = filtered.length === 0 || assig.artisanId === 'manual';
            
            if (!isManual && !assig.artisanId) {
                alert(`Please select an artisan for the ${assig.responsibility} assignment.`);
                return;
            }
            if (isManual && !assig.artisanName.trim()) {
                alert(`Please enter a name for the manual ${assig.responsibility} assignment.`);
                return;
            }
        }
        updates.notificationNumber = notificationNumber;
        updates.assignments = assignments;
        if (assignedTime) updates.assignedTime = new Date(assignedTime).toISOString();
    }
    
    if (canEditResolution) {
        updates.whatWasWrong = whatWasWrong;
        updates.resolutionStatus = resolutionStatus;
        if (resolutionTime) updates.resolutionTime = new Date(resolutionTime).toISOString();

        if (resolutionStatus === 'Other') {
            if (!resolutionNotes.trim()) {
                alert("Description is required when 'Other' status is selected.");
                return;
            }
            updates.resolutionNotes = resolutionNotes;
            updates.resolutionEmployeeNumber = resolutionEmployeeNumber;
            // Clear handover details
            updates.handoverSection = '';
            updates.handoverRecipientId = '';
            updates.handoverRecipientName = '';
            updates.handbackNotes = '';
            updates.handoverSafetyVerified = false;
        } else if (isHandoverSelected) {
            if (!handoverSection) {
                alert("Handover Section / Discipline is required when handing over work.");
                return;
            }
            const nameToUse = handoverRecipientName.trim();
            if (!nameToUse) {
                alert("Handover recipient name is required when handing over work.");
                return;
            }
            const recipient = users.find(u => u.id === handoverRecipientId) 
              || users.find(u => u.name.toLowerCase() === nameToUse.toLowerCase());

            updates.handoverSection = handoverSection;
            updates.handoverRecipientId = recipient ? recipient.id : (handoverRecipientId || 'custom');
            updates.handoverRecipientName = recipient ? recipient.name : nameToUse;
            updates.handbackNotes = handbackNotes.trim();
            updates.handoverSafetyVerified = handoverSafetyVerified;
            updates.resolutionNotes = '';
            updates.resolutionEmployeeNumber = '';
        } else {
            updates.resolutionNotes = ''; // Clear if not 'Other'
            updates.resolutionEmployeeNumber = '';
            updates.handoverSection = '';
            updates.handoverRecipientId = '';
            updates.handoverRecipientName = '';
            updates.handbackNotes = '';
            updates.handoverSafetyVerified = false;
        }
    }

    onSubmit(report.id, updates);
    onClose();
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

  if (!report) return null;

  if (annotatingIndex !== null) {
    return (
      <Modal isOpen={isOpen} onClose={() => setAnnotatingIndex(null)} title="Annotate Defect Image">
        <CanvasAnnotator
          imageUrl={defectImages[annotatingIndex]}
          onSave={handleSaveAnnotation}
          onCancel={() => setAnnotatingIndex(null)}
        />
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Breakdown & Bookings">
      <form onSubmit={handleSubmit} className="space-y-6 max-h-[80vh] overflow-y-auto px-1 pr-4">
        {/* User Context & Draft Alert */}
        {report.status === Status.DRAFT && (
          <div className="bg-amber-950/60 border border-amber-500/60 rounded-lg p-3 text-amber-200 text-xs flex items-center justify-between shadow-md">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <strong className="block text-white text-xs font-bold uppercase tracking-wider">Field Draft Awaiting Verification</strong>
                <span>Review the reported equipment and fault below. Click <strong>"Verify & Submit to Active"</strong> to dispatch.</span>
              </div>
            </div>
          </div>
        )}

        <div className="bg-gray-700/50 p-3 rounded-md border border-gray-600">
            <h4 className="text-gray-400 text-xs font-semibold uppercase mb-1">Context</h4>
            <div className="flex items-center justify-between text-sm">
                <div>
                  <span className="text-gray-400 mr-2">Reporter:</span>
                  <span className="text-white font-medium">{report.reporter?.name || 'Unknown'}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-gray-400 mr-2">Status:</span>
                  <span className={report.status === Status.DRAFT ? "text-amber-400 font-extrabold animate-pulse" : "text-blue-400 font-bold"}>
                    {report.status}
                  </span>
                </div>
            </div>
        </div>

        {/* Basic Info & Initial Time */}
        <div className={`space-y-4 border-b border-gray-700 pb-4 ${!canEditBasicInfo ? 'opacity-60 pointer-events-none' : ''}`}>
            <h4 className="text-gray-400 text-sm font-semibold uppercase flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Basic Report Details
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Equipment Name</label>
                <input type="text" value={equipment} onChange={(e) => setEquipment(e.target.value)} className="w-full bg-gray-700 border border-gray-600 text-white rounded-md p-2 text-sm disabled:text-gray-400 disabled:cursor-not-allowed" disabled={!canEditBasicInfo} required />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">FG Number</label>
                <input type="text" value={equipmentNumber} onChange={(e) => setEquipmentNumber(e.target.value)} className="w-full bg-gray-700 border border-gray-600 text-white rounded-md p-2 text-sm disabled:text-gray-400 disabled:cursor-not-allowed" disabled={!canEditBasicInfo} required />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Reported Fault</label>
              <textarea value={reportedFault} onChange={(e) => setReportedFault(e.target.value)} rows={2} className="w-full bg-gray-700 border border-gray-600 text-white rounded-md p-2 text-sm disabled:text-gray-400 disabled:cursor-not-allowed" disabled={!canEditBasicInfo} required></textarea>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Details (Location/Other)</label>
              <textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={2} className="w-full bg-gray-700 border border-gray-600 text-white rounded-md p-2 text-sm disabled:text-gray-400 disabled:cursor-not-allowed" disabled={!canEditBasicInfo}></textarea>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Defect Images</label>
              <div className="flex flex-col gap-3">
                {canEditBasicInfo && (
                  <label className="flex flex-col items-center justify-center border border-dashed border-gray-600 hover:border-blue-500/50 rounded-lg p-3 cursor-pointer transition bg-gray-800/20 group">
                    <Upload className="w-4 h-4 text-gray-400 group-hover:text-blue-400 transition mb-1" />
                    <span className="text-xs font-semibold text-gray-300 group-hover:text-white transition">Attach More Images</span>
                    <input 
                      type="file" 
                      multiple 
                      accept="image/*" 
                      onChange={handleImageUpload} 
                      className="hidden" 
                    />
                  </label>
                )}

                {defectImages.length > 0 ? (
                  <div className="flex flex-wrap gap-2 p-2 bg-gray-850 rounded border border-gray-700">
                    {defectImages.map((img, idx) => (
                      <div key={idx} className="relative w-16 h-16 group/thumb bg-gray-900 rounded overflow-hidden border border-gray-700 flex items-center justify-center">
                        <img src={img} alt={`defect-${idx}`} className="object-cover w-full h-full animate-fadeIn" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/thumb:opacity-100 transition flex items-center justify-center gap-1">
                          {canEditBasicInfo && (
                            <>
                              <button
                                type="button"
                                onClick={() => setAnnotatingIndex(idx)}
                                className="p-1 bg-blue-600 hover:bg-blue-500 rounded text-white transition"
                                title="Annotate / Markup Image"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeImage(idx)}
                                className="p-1 bg-red-600 hover:bg-red-500 rounded text-white transition"
                                title="Remove Image"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </>
                          )}
                          {!canEditBasicInfo && (
                            <a 
                              href={img} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="p-1 bg-gray-700 hover:bg-gray-600 rounded text-white text-[10px] font-bold"
                            >
                              View
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-gray-500 italic">No images uploaded for this defect.</div>
                )}
              </div>
            </div>

            {report.audioNote && (
              <div className="bg-rose-950/30 p-3 rounded-lg border border-rose-500/30 space-y-1.5">
                <label className="block text-xs font-bold text-rose-300 flex items-center gap-1.5">
                  <span>🎙️</span> Field Worker Voice Note
                </label>
                <audio controls src={report.audioNote} className="w-full h-8" />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Team Member Name (P4)</label>
              <input type="text" value={operatorName} onChange={(e) => setOperatorName(e.target.value)} className="w-full bg-gray-700 border border-gray-600 text-white rounded-md p-2 text-sm disabled:text-gray-400" disabled={!canEditBasicInfo} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Urgency ({urgency})</label>
                <input type="range" min="1" max="10" value={urgency} onChange={(e) => setUrgency(Number(e.target.value))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer mt-3 disabled:cursor-not-allowed" disabled={!canEditBasicInfo} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Reporting Time</label>
                <input type="datetime-local" value={reportingTime} onChange={(e) => setReportingTime(e.target.value)} className="w-full bg-gray-700 border border-gray-600 text-white rounded-md p-2 text-sm disabled:text-gray-400 disabled:cursor-not-allowed" disabled={!canEditBasicInfo} required />
              </div>
            </div>
        </div>

        {/* Bookings & Assigned Time */}
        <div className={`space-y-4 border-b border-gray-700 pb-4 ${!canEditBookings ? 'opacity-60 pointer-events-none' : ''}`}>
            <h4 className="text-gray-400 text-sm font-semibold uppercase flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Booking & Assignments
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Notification Number</label>
                <input type="text" value={notificationNumber} onChange={(e) => setNotificationNumber(e.target.value)} className="w-full bg-gray-700 border border-gray-600 text-white rounded-md p-2 text-sm disabled:text-gray-400" disabled={!canEditBookings} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Assigned Time</label>
                <input type="datetime-local" value={assignedTime} onChange={(e) => setAssignedTime(e.target.value)} className="w-full bg-gray-700 border border-gray-600 text-white rounded-md p-2 text-sm disabled:text-gray-400" disabled={!canEditBookings} />
              </div>
            </div>
            
            <div className="space-y-2">
                <label className="block text-xs font-medium text-gray-400 mb-1">Artisans Booked</label>
                {assignments.map((assignment, index) => {
                    const filteredArtisans = artisans.filter(a => a.responsibility === assignment.responsibility);
                    const isManual = filteredArtisans.length === 0 || assignment.artisanId === 'manual';

                    return (
                        <div key={index} className="space-y-3 p-3 bg-gray-900/50 rounded-md ring-1 ring-gray-700 relative">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Assignment #{index + 1}</span>
                                {canEditBookings && assignments.length > 1 && (
                                    <button type="button" onClick={() => removeAssignment(index)} className="text-red-500 hover:text-red-400 p-1">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                )}
                            </div>

                            {/* TRADE FIRST */}
                            <div>
                                <label className="block text-[10px] font-medium text-gray-400 mb-1">Trade / Responsibility</label>
                                <select 
                                    value={assignment.responsibility} 
                                    onChange={(e) => handleAssignmentChange(index, 'responsibility', e.target.value as any)} 
                                    className="w-full bg-gray-700 border border-gray-600 text-white rounded-md p-1.5 text-xs disabled:text-gray-400" 
                                    disabled={!canEditBookings}
                                >
                                    {Object.values(Responsibility).map(resp => <option key={resp} value={resp}>{resp}</option>)}
                                </select>
                            </div>

                            {!isManual ? (
                                <div>
                                    <label className="block text-[10px] font-medium text-gray-400 mb-1">Select {assignment.responsibility}</label>
                                    <select 
                                        value={assignment.artisanId} 
                                        onChange={(e) => handleAssignmentChange(index, 'artisanId', e.target.value as any)} 
                                        className="w-full bg-gray-700 border border-gray-600 text-white rounded-md p-1.5 text-xs disabled:text-gray-400" 
                                        disabled={!canEditBookings}
                                    >
                                        <option value="" disabled>Choose artisan...</option>
                                        {filteredArtisans.map(artisan => <option key={artisan.id} value={artisan.id}>{artisan.name}</option>)}
                                        {assignment.artisanId && assignment.artisanId !== 'manual' && !filteredArtisans.find(a => a.id === assignment.artisanId) && (
                                            <option value={assignment.artisanId}>{assignment.artisanName} (Not in current shift)</option>
                                        )}
                                    </select>
                                </div>
                            ) : (
                                <div className="bg-gray-800/50 p-3 rounded border border-gray-700 space-y-3">
                                    <p className="text-[9px] text-yellow-500 uppercase font-bold">No registered artisans. Manual entry:</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="col-span-2">
                                            <label className="block text-[10px] font-medium text-gray-400 mb-0.5">Full Name</label>
                                            <input 
                                                type="text" 
                                                value={assignment.artisanName} 
                                                onChange={(e) => handleAssignmentChange(index, 'artisanName', e.target.value as any)} 
                                                className="w-full bg-gray-700 border border-gray-600 text-white rounded p-1 text-xs disabled:text-gray-400" 
                                                placeholder="Name"
                                                disabled={!canEditBookings}
                                                required 
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-medium text-gray-400 mb-0.5">Employee #</label>
                                            <input 
                                                type="text" 
                                                value={assignment.employeeNumber || ''} 
                                                onChange={(e) => handleAssignmentChange(index, 'employeeNumber', e.target.value as any)} 
                                                className="w-full bg-gray-700 border border-gray-600 text-white rounded p-1 text-xs disabled:text-gray-400" 
                                                placeholder="Optional"
                                                disabled={!canEditBookings}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-medium text-gray-400 mb-0.5">Specialty</label>
                                            <input 
                                                type="text" 
                                                value={assignment.specialty || ''} 
                                                onChange={(e) => handleAssignmentChange(index, 'specialty', e.target.value as any)} 
                                                className="w-full bg-gray-700 border border-gray-600 text-white rounded p-1 text-xs disabled:text-gray-400" 
                                                placeholder="e.g. Rigger"
                                                disabled={!canEditBookings}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
                {canEditBookings && (
                    <button type="button" onClick={addAssignment} className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center mt-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" />
                        </svg>
                        Book Artisan
                    </button>
                )}
            </div>
        </div>

        {/* Resolution & Closure Times */}
        <div className={`space-y-4 ${!canEditResolution ? 'opacity-60 pointer-events-none' : ''}`}>
            <h4 className="text-gray-400 text-sm font-semibold uppercase flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Resolution & Closure
            </h4>
            <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Fault Found / Work Done</label>
                <textarea value={whatWasWrong} onChange={(e) => setWhatWasWrong(e.target.value)} rows={2} className="w-full bg-gray-700 border border-gray-600 text-white rounded-md p-2 text-sm disabled:text-gray-400" disabled={!canEditResolution}></textarea>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Resolution Status</label>
                    <select value={resolutionStatus} onChange={(e) => setResolutionStatus(e.target.value as ResolutionStatus)} className="w-full bg-gray-700 border border-gray-600 text-white rounded-md p-2 text-sm disabled:text-gray-400" disabled={!canEditResolution}>
                        <option value="">Not resolved yet</option>
                        {resolutionStatuses.map(status => <option key={status.id} value={status.name}>{status.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Resolution Time</label>
                    <input type="datetime-local" value={resolutionTime} onChange={(e) => setResolutionTime(e.target.value)} className="w-full bg-gray-700 border border-gray-600 text-white rounded-md p-2 text-sm disabled:text-gray-400" disabled={!canEditResolution} />
                </div>
            </div>

             {isHandoverSelected && canEditResolution && (
                <div className="space-y-3 bg-purple-950/20 p-3 rounded-md border border-purple-700/50 animate-fadeIn">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-300 mb-1">Handover Section / Discipline <span className="text-red-500">*</span></label>
                            <select 
                                value={handoverSection} 
                                onChange={(e) => {
                                    setHandoverSection(e.target.value);
                                    setHandoverRecipientId('');
                                    setHandoverRecipientName('');
                                    setIsRecipientDropdownOpen(false);
                                }} 
                                className="w-full bg-gray-700 border border-gray-600 text-white rounded-md p-2 text-xs" 
                                required
                            >
                                <option value="">-- Select Section / Discipline --</option>
                                {availableSections.map(sec => <option key={sec.id} value={sec.name}>{sec.name}</option>)}
                            </select>
                        </div>
                        <div className="relative">
                            <label className="block text-xs font-medium text-gray-300 mb-1 flex justify-between items-center">
                                <span>Handover Recipient <span className="text-red-500">*</span></span>
                                {targetRoleForSection && (
                                    <span className="text-[9px] text-blue-400 font-semibold bg-blue-900/40 px-1 rounded border border-blue-800">
                                        Role: {targetRoleForSection}
                                    </span>
                                )}
                            </label>
                            <div className="relative">
                                <input 
                                    type="text"
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
                                    placeholder="Type a name or select from list..."
                                    className="w-full bg-gray-700 border border-gray-600 text-white rounded-md p-2 pr-14 text-xs focus:outline-none focus:border-blue-500"
                                    required
                                    autoComplete="off"
                                />
                                <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center space-x-1 z-10">
                                    {handoverRecipientName && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setHandoverRecipientName('');
                                                setHandoverRecipientId('');
                                                setIsRecipientDropdownOpen(true);
                                            }}
                                            className="text-gray-400 hover:text-white p-0.5 text-xs"
                                            title="Clear"
                                        >
                                            ✕
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => setIsRecipientDropdownOpen(!isRecipientDropdownOpen)}
                                        className="text-gray-400 hover:text-white p-0.5"
                                        title="Toggle list"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-3.5 w-3.5 transition-transform ${isRecipientDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                                        <div className="absolute left-0 right-0 mt-1 bg-gray-800 border border-gray-600 rounded-md shadow-2xl max-h-44 overflow-y-auto z-50 divide-y divide-gray-700/60">
                                            {matchingUsers.length > 0 ? (
                                                matchingUsers.map(u => (
                                                    <div
                                                        key={u.id}
                                                        onClick={() => {
                                                            setHandoverRecipientName(u.name);
                                                            setHandoverRecipientId(u.id);
                                                            setIsRecipientDropdownOpen(false);
                                                        }}
                                                        className={`px-2.5 py-1.5 text-xs cursor-pointer hover:bg-gray-700/80 flex items-center justify-between transition ${
                                                            handoverRecipientId === u.id ? 'bg-blue-900/50 text-blue-200 font-semibold' : 'text-gray-200'
                                                        }`}
                                                    >
                                                        <div>
                                                            <span className="font-medium text-white">{u.name}</span>
                                                            {u.employeeNumber && <span className="text-[10px] text-gray-400 ml-1">(#{u.employeeNumber})</span>}
                                                        </div>
                                                        <span className="text-[9px] text-blue-300 bg-gray-900 px-1 py-0.5 rounded border border-gray-700">
                                                            {u.role}
                                                        </span>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="px-2.5 py-1.5 text-xs text-gray-400 italic">
                                                    No registered user found matching "{handoverRecipientName}". You can submit this as a custom name.
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>

                            {noMatchesForFilter && (
                                <p className="text-[9px] text-amber-400 italic mt-1 leading-tight">
                                    Showing all since no active team members have the "{targetRoleForSection}" role.
                                </p>
                            )}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-300 mb-1">Handback & Remaining Advisory Notes</label>
                        <textarea
                            value={handbackNotes}
                            onChange={(e) => setHandbackNotes(e.target.value)}
                            rows={2}
                            placeholder="Record remaining work, required spares, isolation status, or safety advisories..."
                            className="w-full bg-gray-700 border border-gray-600 text-white rounded-md p-2 text-xs"
                        />
                    </div>

                    <label className="flex items-start gap-2 p-2 rounded bg-gray-800/80 border border-gray-700 cursor-pointer hover:border-emerald-600/60 transition">
                        <input
                            type="checkbox"
                            checked={handoverSafetyVerified}
                            onChange={(e) => setHandoverSafetyVerified(e.target.checked)}
                            className="mt-0.5 h-3.5 w-3.5 rounded border-gray-600 text-emerald-600 focus:ring-emerald-500 bg-gray-700"
                        />
                        <span className="text-[11px] text-gray-200 leading-snug">
                            <strong className="text-emerald-400">Safety & Handback Verified:</strong> Personal lockout padlocks removed/transferred & equipment safely verified for handover.
                        </span>
                    </label>
                </div>
            )}

            {resolutionStatus === 'Other' && canEditResolution && (
                <div className="grid grid-cols-2 gap-4 bg-gray-900/50 p-3 rounded-md border border-gray-700">
                     <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">Description (Required)</label>
                        <textarea value={resolutionNotes} onChange={(e) => setResolutionNotes(e.target.value)} rows={2} className="w-full bg-gray-700 border border-gray-600 text-white rounded-md p-2 text-sm" required></textarea>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">Employee Number</label>
                        <input type="text" value={resolutionEmployeeNumber} onChange={(e) => setResolutionEmployeeNumber(e.target.value)} className="w-full bg-gray-700 border border-gray-600 text-white rounded-md p-2 text-sm" placeholder="Optional" />
                    </div>
                </div>
            )}
        </div>

        <div>
            <label htmlFor="edit-responsibility" className="block text-xs font-medium text-gray-300 mb-1">Responsibility (Optional)</label>
            <select
                id="edit-responsibility"
                value={responsibility}
                onChange={(e) => setResponsibility(e.target.value as Responsibility | '')}
                className="w-full bg-gray-700 border border-gray-600 text-white rounded-md p-2 text-sm"
            >
                <option value="">-- Not specified --</option>
                {Object.values(Responsibility).map(resp => (
                    <option key={resp} value={resp}>{resp}</option>
                ))}
            </select>
        </div>

        <div className="flex flex-wrap justify-end pt-4 gap-2">
            <button type="button" onClick={onClose} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md">Cancel</button>
            <button type="submit" className={`bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md shadow-lg ${(canEditBasicInfo || canEditBookings || canEditResolution || report?.status === Status.DRAFT) ? '' : 'hidden'}`}>
              {report?.status === Status.DRAFT ? 'Save Draft' : 'Save All Changes'}
            </button>
            {report?.status === Status.DRAFT && (
              <button 
                type="button" 
                onClick={(e) => handleSubmit(e, Status.ACTIVE)} 
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-black py-2 px-4 rounded-md shadow-lg flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                Verify & Submit to Active
              </button>
            )}
        </div>
      </form>
    </Modal>
  );
};

export default EditReportModal;
