import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AREA_EQUIPMENT_DATA, EquipmentItem } from '../modals/equipmentData';
import { submitFieldReport, SubmitFieldReportResult } from '../../services/fieldReportService';
import { lockoutService } from '../../services/lockoutService';
import { compressImage } from '../../utils';
import { 
  subscribeAreaFaultPresets, 
  getDefaultFaultsForArea, 
  getCachedAreaFaultPresets 
} from '../../services/areaFaultService';
import { 
  Camera, 
  Image as ImageIcon, 
  Mic, 
  Square, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  RotateCcw, 
  QrCode, 
  Send, 
  Play, 
  Pause, 
  ShieldAlert, 
  MapPin, 
  Wrench, 
  User, 
  Hash, 
  Sparkles, 
  X,
  Lock,
  Unlock,
  Check,
  Smartphone
} from 'lucide-react';

import { INITIAL_WORK_GROUPS } from '../../constants';
import { Responsibility } from '../../types';

export const FieldReportPortal: React.FC = () => {
  // --- Active Tab State ---
  const [activeTab, setActiveTab] = useState<'breakdown' | 'jobcard'>('breakdown');

  // --- Dynamic WorkGroups / Areas from Database ---
  const [workGroupList, setWorkGroupList] = useState<{ id: string; name: string }[]>(() => {
    try {
      const cached = localStorage.getItem('cache_workgroups');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return INITIAL_WORK_GROUPS;
  });

  // --- Dynamic Area Problem Description Presets ---
  const [areaPresetsMap, setAreaPresetsMap] = useState<Record<string, string[]>>(() => getCachedAreaFaultPresets());

  useEffect(() => {
    const unsub = subscribeAreaFaultPresets((presets) => {
      setAreaPresetsMap(presets);
    });
    return () => unsub();
  }, []);

  // --- Tab 1 Form State ---
  const [selectedArea, setSelectedArea] = useState<string>(() => {
    return localStorage.getItem('bdr_field_reporter_area') || 'GG';
  });
  const [qrParamFound, setQrParamFound] = useState<string | null>(null);

  const [responsibleDept, setResponsibleDept] = useState<'Maintenance' | 'Operations' | 'Responsibility'>('Maintenance');
  const [reportedFault, setReportedFault] = useState<string>('');
  const [details, setDetails] = useState<string>('');
  const [urgency, setUrgency] = useState<number>(5);
  const [safetyConcern, setSafetyConcern] = useState<boolean>(false);

  // Reporter details shared / persisted
  const [reporterName, setReporterName] = useState<string>(() => {
    return localStorage.getItem('bdr_field_reporter_name') || '';
  });
  const [employeeNumber, setEmployeeNumber] = useState<string>(() => {
    return localStorage.getItem('bdr_field_reporter_emp') || '';
  });

  // Attachments (Photos)
  const [photos, setPhotos] = useState<string[]>([]);
  const [isCompressing, setIsCompressing] = useState<boolean>(false);

  // Audio Recording
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingDuration, setRecordingDuration] = useState<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  // --- Tab 2 (Job Card / Isolation) Form State ---
  const [jobCardArea, setJobCardArea] = useState<string>(() => {
    return localStorage.getItem('bdr_field_reporter_area') || 'GG';
  });
  const [jobCardEquipment, setJobCardEquipment] = useState<string>('');
  const [jobCardEquipmentNumber, setJobCardEquipmentNumber] = useState<string>('');
  const [jobCardRequester, setJobCardRequester] = useState<string>(() => {
    return localStorage.getItem('bdr_field_reporter_name') || '';
  });
  const [bookedDurationMinutes, setBookedDurationMinutes] = useState<number | null>(null);
  const [jobCardComments, setJobCardComments] = useState<string>('');
  const [jobCardResponsibility, setJobCardResponsibility] = useState<string>('Operations');

  // Submission State
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [submittedResult, setSubmittedResult] = useState<{ type: 'breakdown' | 'jobcard'; ref: string; timestamp: string; title: string } | null>(null);

  // --- PWA / Mobile Shortcut Installation ---
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallModal, setShowInstallModal] = useState<boolean>(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      setShowInstallModal(true);
    }
  };

  // --- Parse Area & QR Parameters on Mount ---
  useEffect(() => {
    const savedArea = localStorage.getItem('bdr_field_reporter_area');
    if (savedArea) {
      const matched = workGroupList.find(a => a.name.toLowerCase() === savedArea.toLowerCase());
      if (matched) {
        setSelectedArea(matched.name);
        setJobCardArea(matched.name);
      }
    }

    const params = new URLSearchParams(window.location.search);
    const areaParam = params.get('area') || params.get('workGroup') || params.get('section');
    const actionParam = params.get('action');

    if (actionParam === 'request_lockout') {
      setActiveTab('jobcard');
    }

    if (areaParam) {
      const matched = workGroupList.find(a => a.name.toLowerCase() === areaParam.toLowerCase());
      if (matched) {
        setSelectedArea(matched.name);
        setJobCardArea(matched.name);
        setQrParamFound(`Area: ${matched.name}`);
      } else {
        setSelectedArea(areaParam);
        setJobCardArea(areaParam);
        setQrParamFound(`Area: ${areaParam}`);
      }
    }
  }, [workGroupList]);

  // Common faults for Tab 1
  const commonFaults = useMemo(() => {
    if (areaPresetsMap[selectedArea] && areaPresetsMap[selectedArea].length > 0) {
      return areaPresetsMap[selectedArea];
    }
    return getDefaultFaultsForArea(selectedArea);
  }, [selectedArea, areaPresetsMap]);

  // --- Photo Upload Handling ---
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (photos.length + files.length > 5) {
      alert('You can attach a maximum of 5 photos.');
      return;
    }

    setIsCompressing(true);
    try {
      const promises = Array.from(files).map(async (file: File) => {
        return await compressImage(file, 900, 900, 0.75);
      });
      const compressedList = await Promise.all(promises);
      setPhotos(prev => [...prev, ...compressedList]);
    } catch (err) {
      console.error('Photo compression error:', err);
      alert('Failed to process image. Please try again.');
    } finally {
      setIsCompressing(false);
      e.target.value = '';
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  // --- Voice Note Handling via MediaRecorder ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          setAudioBase64(reader.result as string);
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);

      timerRef.current = window.setInterval(() => {
        setRecordingDuration(d => {
          if (d >= 60) {
            stopRecording();
            return 60;
          }
          return d + 1;
        });
      }, 1000);
    } catch (err) {
      console.error('Microphone access denied or unsupported:', err);
      alert('Could not access microphone. Please check your browser permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const deleteRecording = () => {
    setAudioBase64(null);
    setRecordingDuration(0);
  };

  // --- Tab 1 Submission ---
  const handleBreakdownSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmissionError(null);

    if (!reportedFault.trim()) {
      setSubmissionError('Please describe the problem or fault.');
      return;
    }

    if (!reporterName.trim()) {
      setSubmissionError('Please enter your full name.');
      return;
    }

    setSubmitting(true);

    try {
      localStorage.setItem('bdr_field_reporter_name', reporterName.trim());
      localStorage.setItem('bdr_field_reporter_area', selectedArea);
      if (employeeNumber.trim()) {
        localStorage.setItem('bdr_field_reporter_emp', employeeNumber.trim());
      }

      const result = await submitFieldReport({
        reporterName: reporterName.trim(),
        employeeNumber: employeeNumber.trim() || undefined,
        area: selectedArea,
        equipment: `${selectedArea} Area`,
        equipmentNumber: `${selectedArea}-DISPATCH`,
        reportedFault: `[${responsibleDept}] ${reportedFault.trim()}`,
        details: details.trim() || undefined,
        urgency,
        safetyConcern,
        defectImages: photos.length > 0 ? photos : undefined,
        audioNote: audioBase64 || undefined
      });

      setSubmittedResult({
        type: 'breakdown',
        ref: result.reportNumber,
        timestamp: result.timestamp,
        title: reportedFault.trim()
      });
    } catch (err: any) {
      console.error('Field report submission error:', err);
      setSubmissionError(err.message || 'We could not send your report. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // --- Tab 2 Submission (Request Job Card / Isolation) ---
  const handleJobCardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmissionError(null);

    if (!jobCardEquipment.trim()) {
      setSubmissionError('Please enter the equipment name.');
      return;
    }

    if (!jobCardRequester.trim()) {
      setSubmissionError('Please enter the name of the person requesting the job card.');
      return;
    }

    setSubmitting(true);

    try {
      localStorage.setItem('bdr_field_reporter_name', jobCardRequester.trim());
      localStorage.setItem('bdr_field_reporter_area', jobCardArea);
      if (employeeNumber.trim()) {
        localStorage.setItem('bdr_field_reporter_emp', employeeNumber.trim());
      }

      const ticketId = await lockoutService.requestLockout({
        equipment: jobCardEquipment.trim(),
        equipmentNumber: jobCardEquipmentNumber.trim() || `${jobCardArea}-EQUIP`,
        workGroup: jobCardArea,
        workType: `Job Card - ${jobCardResponsibility}`,
        requestedByUserId: 'field-user-' + Date.now(),
        requestedByUserName: jobCardRequester.trim(),
        requestedByUserEmployeeNumber: employeeNumber.trim() || undefined,
        bookedDurationMinutes: bookedDurationMinutes,
        lockoutComments: jobCardComments.trim() || 'Field requested work isolation & job card'
      });

      setSubmittedResult({
        type: 'jobcard',
        ref: `TCK-${ticketId.slice(0, 6).toUpperCase()}`,
        timestamp: new Date().toISOString(),
        title: jobCardEquipment.trim()
      });
    } catch (err: any) {
      console.error('Job card request error:', err);
      setSubmissionError(err.message || 'Failed to submit job card request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSubmittedResult(null);
    setSubmissionError(null);
    setReportedFault('');
    setDetails('');
    setUrgency(5);
    setSafetyConcern(false);
    setPhotos([]);
    setAudioBase64(null);
    setRecordingDuration(0);
    setJobCardEquipment('');
    setJobCardEquipmentNumber('');
    setJobCardComments('');
  };

  // --- Confirmation Screen ---
  if (submittedResult) {
    const isBreakdown = submittedResult.type === 'breakdown';
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-center animate-in fade-in zoom-in-95 duration-200">
          
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5 ${
            isBreakdown 
              ? 'bg-emerald-500/10 border-2 border-emerald-500 text-emerald-400' 
              : 'bg-amber-500/10 border-2 border-amber-500 text-amber-400'
          }`}>
            {isBreakdown ? <CheckCircle2 className="w-12 h-12 stroke-[2.5]" /> : <Lock className="w-10 h-10 stroke-[2.5]" />}
          </div>

          <span className={`inline-block text-[11px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full mb-3 ${
            isBreakdown 
              ? 'text-emerald-400 bg-emerald-950/60 border border-emerald-500/30' 
              : 'text-amber-400 bg-amber-950/60 border border-amber-500/30'
          }`}>
            {isBreakdown ? 'Draft Logged · Awaiting Reporter Verification' : 'Isolation Requested · Awaiting SCADA & Lockout Confirmation'}
          </span>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-2">
            {isBreakdown ? 'Draft Report Submitted' : 'Job Card & Isolation Requested'}
          </h1>

          <p className="text-slate-400 text-sm mb-6">
            Your {isBreakdown ? 'breakdown report' : 'job card request'} has been successfully registered in the dispatch queue.
          </p>

          {/* Reference Card */}
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 text-left space-y-2.5 mb-6">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800/60 text-xs">
              <span className="text-slate-500 font-medium">Ticket Reference</span>
              <span className={`font-mono font-bold text-sm tracking-wider ${isBreakdown ? 'text-emerald-400' : 'text-amber-400'}`}>
                {submittedResult.ref}
              </span>
            </div>
            
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">Area / Section</span>
              <span className="text-slate-200 font-semibold">{isBreakdown ? selectedArea : jobCardArea} Area</span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">Reporter</span>
              <span className="text-slate-300">{reporterName || jobCardRequester} {employeeNumber && `(#${employeeNumber})`}</span>
            </div>

            <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-800/60">
              <span className="text-slate-500 font-medium">Logged Time</span>
              <span className="text-slate-400 font-mono">
                {new Date(submittedResult.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>

          <button
            onClick={resetForm}
            className={`w-full h-13 min-h-[48px] active:scale-[0.98] text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg transition cursor-pointer ${
              isBreakdown ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20' : 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/20'
            }`}
          >
            <RotateCcw className="w-5 h-5" />
            <span>{isBreakdown ? 'Submit Another Report' : 'Request Another Job Card'}</span>
          </button>
        </div>
        
        <div className="mt-6 text-center text-xs text-slate-500 font-medium">
          Breakdown Dispatch System · Field Worker Portal
        </div>
      </div>
    );
  }

  // --- Main Field Report Portal Layout with Two Tabs ---
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-blue-600 selection:text-white">
      
      {/* Top Sticky Header */}
      <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img 
            src="https://res.cloudinary.com/dcgkov1em/image/upload/v1791118593/bdrlogosnobg_txnuak.png" 
            alt="BDR Logo" 
            className="h-9 w-auto object-contain drop-shadow"
          />
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
              Breakdown Dispatch
              <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.2 bg-blue-950 text-blue-400 border border-blue-800/60 rounded">
                Field
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">Quick Plant Breakdown Report</p>
          </div>
        </div>

        {/* Safety Indicator Badge */}
        {safetyConcern && activeTab === 'breakdown' && (
          <div className="flex items-center gap-1 bg-red-950/80 border border-red-500/40 text-red-300 text-[10px] font-bold px-2 py-1 rounded-full animate-pulse">
            <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
            <span>Safety Issue</span>
          </div>
        )}
      </header>

      {/* Sticky Two-Tab Switcher */}
      <nav className="sticky top-14 z-20 bg-slate-950/90 backdrop-blur border-b border-slate-800 grid grid-cols-2">
        <button
          type="button"
          onClick={() => setActiveTab('breakdown')}
          className={`h-12 text-xs font-bold flex items-center justify-center gap-2 border-b-2 transition cursor-pointer ${
            activeTab === 'breakdown'
              ? 'border-blue-500 text-white bg-slate-900/50'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Wrench className={`w-4 h-4 ${activeTab === 'breakdown' ? 'text-blue-400' : 'text-slate-500'}`} />
          <span>Report Breakdown</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('jobcard')}
          className={`h-12 text-xs font-bold flex items-center justify-center gap-2 border-b-2 transition cursor-pointer ${
            activeTab === 'jobcard'
              ? 'border-amber-500 text-white bg-slate-900/50'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Lock className={`w-4 h-4 ${activeTab === 'jobcard' ? 'text-amber-400' : 'text-slate-500'}`} />
          <span>Request Job Card</span>
        </button>
      </nav>

      {/* Main Scrollable Form Body */}
      <main className="flex-1 max-w-lg w-full mx-auto p-4 pb-28 space-y-5">
        
        {/* Error Alert Display */}
        {submissionError && (
          <div className="bg-red-950/70 border-2 border-red-500/50 rounded-2xl p-4 text-red-200 text-xs flex items-start gap-3 shadow-lg">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <strong className="block font-bold text-red-300 text-sm mb-0.5">Submission Failed</strong>
              <span>{submissionError}</span>
            </div>
            <button 
              type="button" 
              onClick={() => setSubmissionError(null)}
              className="text-red-400 hover:text-red-200 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Add to Home Screen Banner */}
        <div className="bg-gradient-to-r from-blue-950/60 to-indigo-950/60 border border-blue-500/30 rounded-2xl p-3.5 flex items-center justify-between text-xs text-blue-200 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-white block">Quick Access Shortcut</span>
              <span className="text-[11px] text-blue-300/90">Add portal to your mobile home screen</span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleInstallClick}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow transition text-[11px] cursor-pointer"
          >
            Add Shortcut
          </button>
        </div>

        {/* QR Code Identified Banner */}
        {qrParamFound && (
          <div className="bg-emerald-950/50 border border-emerald-500/40 rounded-2xl p-3.5 flex items-center justify-between text-xs text-emerald-200">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                <Check className="w-4 h-4 stroke-[3]" />
              </div>
              <div>
                <span className="font-bold text-white block">Plant Area Selected via QR</span>
                <span className="text-[11px] text-emerald-400/90">{qrParamFound}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setQrParamFound(null)}
              className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 underline px-2 py-1 flex items-center gap-1"
            >
              <span>Dismiss</span>
            </button>
          </div>
        )}

        {/* TAB 1: REPORT BREAKDOWN FORM */}
        {activeTab === 'breakdown' && (
          <form onSubmit={handleBreakdownSubmit} className="space-y-5">

            {/* Plant Area Selection */}
            <section className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-2.5 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-blue-400" />
                  Plant Area
                </h2>
                <span className="text-[10px] text-emerald-400 font-bold font-mono bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  {selectedArea} Area
                </span>
              </div>

              <div className="relative pt-1">
                <select
                  value={selectedArea}
                  onChange={e => {
                    const val = e.target.value;
                    setSelectedArea(val);
                    localStorage.setItem('bdr_field_reporter_area', val);
                  }}
                  className="w-full h-12 min-h-[44px] bg-slate-950 border border-slate-800 hover:border-slate-700 text-white text-xs font-bold rounded-xl px-3.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none cursor-pointer"
                >
                  {workGroupList.map(wg => (
                    <option key={wg.id || wg.name} value={wg.name}>
                      {wg.name} Area
                    </option>
                  ))}
                </select>
              </div>
            </section>

            {/* Responsible Department */}
            <section className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-sm">
              <div className="border-b border-slate-800 pb-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5 text-blue-400" />
                  Responsible Department
                </h2>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {(['Maintenance', 'Operations', 'Responsibility'] as const).map(dept => (
                  <button
                    key={dept}
                    type="button"
                    onClick={() => setResponsibleDept(dept)}
                    className={`h-11 text-xs font-bold rounded-xl border transition cursor-pointer flex items-center justify-center ${
                      responsibleDept === dept
                        ? 'bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-600/20'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    {dept}
                  </button>
                ))}
              </div>
            </section>

            {/* Problem Description */}
            <section className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3.5 shadow-sm">
              <div className="border-b border-slate-800 pb-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                  Problem Description
                </h2>
              </div>

              {/* Quick Tap Common Faults */}
              {commonFaults.length > 0 && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    Quick Tap Common Faults in {selectedArea} Area
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {commonFaults.map((fault, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setReportedFault(fault)}
                        className={`text-[11px] text-left px-2.5 py-1.5 rounded-lg border transition cursor-pointer ${
                          reportedFault === fault 
                            ? 'bg-blue-600/30 border-blue-500 text-blue-200 font-semibold' 
                            : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        {fault}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
                  Fault Description <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={reportedFault}
                  onChange={e => setReportedFault(e.target.value)}
                  placeholder="Describe what is broken, abnormal sounds, leaks, trip alarms..."
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 text-white text-sm rounded-xl p-3 focus:border-blue-500 outline-none leading-relaxed resize-none"
                  required
                />
              </div>

              {/* Urgency Slider */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-[11px] font-semibold text-slate-400">Urgency Level ({urgency}/10)</label>
                  <span className={`text-[11px] font-bold uppercase tracking-wider ${
                    urgency >= 8 ? 'text-red-400' : urgency >= 5 ? 'text-amber-400' : 'text-blue-400'
                  }`}>
                    {urgency >= 8 ? 'High Priority' : urgency >= 5 ? 'Medium' : 'Standard'}
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={urgency}
                  onChange={e => setUrgency(Number(e.target.value))}
                  className="w-full h-2.5 bg-slate-950 border border-slate-800 rounded-lg appearance-none cursor-pointer outline-none accent-blue-500"
                />
                <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
                  <span>1 (Low)</span>
                  <span>5 (Normal)</span>
                  <span>10 (Emergency)</span>
                </div>
              </div>

              {/* Safety Concern Toggle Card */}
              <div 
                onClick={() => setSafetyConcern(!safetyConcern)}
                className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition select-none ${
                  safetyConcern 
                    ? 'bg-red-950/40 border-red-500/60 text-red-200' 
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`p-1.5 rounded-lg ${safetyConcern ? 'bg-red-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold block text-slate-200">Safety Concern Involved</span>
                    <span className="text-[10px] text-slate-400">Flag if there is risk to personnel, leak, or electrical hazard</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={safetyConcern}
                  onChange={() => {}}
                  className="w-4 h-4 rounded text-red-600 focus:ring-0 focus:ring-offset-0 bg-slate-900 border-slate-700 pointer-events-none"
                />
              </div>

              {/* Additional Notes */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">Additional Location / Notes (Optional)</label>
                <input
                  type="text"
                  value={details}
                  onChange={e => setDetails(e.target.value)}
                  placeholder="e.g. Drive side, transfer chute #2, ground level"
                  className="w-full h-12 min-h-[44px] bg-slate-950 border border-slate-800 text-white text-sm rounded-xl px-3.5 focus:border-blue-500 outline-none"
                />
              </div>
            </section>

            {/* Photos & Voice Note */}
            <section className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3.5 shadow-sm">
              <p className="text-xs text-amber-300">Photo and voice attachments are unavailable for this release. Describe the defect in the report details.</p>
              <div className="border-b border-slate-800 pb-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-blue-400" />
                  Photos & Voice Note (Optional)
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <label className="h-12 min-h-[48px] bg-slate-950 hover:bg-slate-850 border border-slate-800 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-slate-200 cursor-pointer transition shadow-sm active:scale-[0.98]">
                  <Camera className="w-4 h-4 text-blue-400" />
                  <span>Take Photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoUpload}
                    disabled
                    className="hidden"
                  />
                </label>

                <label className="h-12 min-h-[48px] bg-slate-950 hover:bg-slate-850 border border-slate-800 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-slate-200 cursor-pointer transition shadow-sm active:scale-[0.98]">
                  <ImageIcon className="w-4 h-4 text-slate-400" />
                  <span>From Gallery</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoUpload}
                    disabled
                    className="hidden"
                  />
                </label>
              </div>

              {isCompressing && (
                <div className="text-center text-xs text-blue-400 animate-pulse font-medium">
                  Compressing photo...
                </div>
              )}

              {photos.length > 0 && (
                <div className="grid grid-cols-3 gap-2 pt-1">
                  {photos.map((img, idx) => (
                    <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-slate-800 bg-slate-950 group">
                      <img src={img} alt={`Defect ${idx + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removePhoto(idx)}
                        className="absolute top-1 right-1 p-1 bg-red-600 hover:bg-red-500 rounded-full text-white shadow-md transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Voice Note Recorder */}
              <div className="pt-2 border-t border-slate-800/80">
                <label className="block text-[11px] font-semibold text-slate-400 mb-2 flex items-center justify-between">
                  <span>Record Voice Explanation</span>
                  {audioBase64 && <span className="text-[10px] text-emerald-400 font-bold uppercase">Recorded</span>}
                </label>

                {!audioBase64 ? (
                  <div>
                    {!isRecording ? (
                      <button
                        type="button"
                        onClick={startRecording}
                        disabled
                        className="w-full h-12 min-h-[48px] bg-slate-950 hover:bg-slate-850 border border-slate-800 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-slate-300 transition cursor-pointer active:scale-[0.98]"
                      >
                        <Mic className="w-4 h-4 text-rose-400" />
                        <span>Record Voice Note</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={stopRecording}
                        className="w-full h-12 min-h-[48px] bg-rose-600 hover:bg-rose-500 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-white transition cursor-pointer animate-pulse shadow-lg shadow-rose-600/30"
                      >
                        <Square className="w-4 h-4 fill-white" />
                        <span>Stop Recording ({recordingDuration}s / 60s)</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-3">
                    <audio src={audioBase64} controls className="h-8 flex-1 max-w-[240px]" />
                    <button
                      type="button"
                      onClick={deleteRecording}
                      className="p-2 text-rose-400 hover:text-rose-300 bg-rose-950/40 border border-rose-900/60 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                )}
              </div>
            </section>

            {/* Reporter Details */}
            <section className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3.5 shadow-sm">
              <div className="border-b border-slate-800 pb-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-blue-400" />
                  Reporter Details
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
                    Your Full Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={reporterName}
                    onChange={e => setReporterName(e.target.value)}
                    placeholder="e.g. John Khumalo"
                    className="w-full h-12 min-h-[44px] bg-slate-950 border border-slate-800 text-white text-sm rounded-xl px-3.5 focus:border-blue-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
                    Employee Number / ID
                  </label>
                  <input
                    type="text"
                    value={employeeNumber}
                    onChange={e => setEmployeeNumber(e.target.value)}
                    placeholder="e.g. 548201"
                    className="w-full h-12 min-h-[44px] bg-slate-950 border border-slate-800 text-white text-sm rounded-xl px-3.5 focus:border-blue-500 outline-none font-mono"
                  />
                </div>
              </div>
            </section>

            {/* Submit Action Button (Sticky Bottom Container) */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent z-40">
              <div className="max-w-lg mx-auto">
                <button
                  type="submit"
                  disabled={submitting || isCompressing || isRecording}
                  className="w-full h-13 min-h-[48px] bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-base font-bold rounded-2xl flex items-center justify-center gap-2.5 shadow-xl shadow-blue-600/25 active:scale-[0.98] transition cursor-pointer tracking-wide uppercase"
                >
                  {submitting ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Submitting Report...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      <span>Submit Breakdown Report</span>
                    </>
                  )}
                </button>
              </div>
            </div>

          </form>
        )}

        {/* TAB 2: REQUEST JOB CARD / ISOLATION FORM */}
        {activeTab === 'jobcard' && (
          <form onSubmit={handleJobCardSubmit} className="space-y-5">

            {/* Plant Area */}
            <section className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-2.5 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  Plant Area
                </h2>
                <span className="text-[10px] text-amber-400 font-bold font-mono bg-amber-950/60 border border-amber-500/30 px-2 py-0.5 rounded-full">
                  {jobCardArea} Area
                </span>
              </div>

              <div className="relative pt-1">
                <select
                  value={jobCardArea}
                  onChange={e => {
                    const val = e.target.value;
                    setJobCardArea(val);
                    localStorage.setItem('bdr_field_reporter_area', val);
                  }}
                  className="w-full h-12 min-h-[44px] bg-slate-950 border border-slate-800 hover:border-slate-700 text-white text-xs font-bold rounded-xl px-3.5 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none cursor-pointer"
                >
                  {workGroupList.map(wg => (
                    <option key={wg.id || wg.name} value={wg.name}>
                      {wg.name} Area
                    </option>
                  ))}
                </select>
              </div>
            </section>

            {/* Equipment Details */}
            <section className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3.5 shadow-sm">
              <div className="border-b border-slate-800 pb-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5 text-amber-400" />
                  Equipment Details
                </h2>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
                  Equipment Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={jobCardEquipment}
                  onChange={e => setJobCardEquipment(e.target.value)}
                  placeholder="e.g. CV-01 Conveyor Drive"
                  className="w-full h-12 min-h-[44px] bg-slate-950 border border-slate-800 text-white text-sm rounded-xl px-3.5 focus:border-amber-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
                  Equipment Tag / Number (Optional)
                </label>
                <input
                  type="text"
                  value={jobCardEquipmentNumber}
                  onChange={e => setJobCardEquipmentNumber(e.target.value)}
                  placeholder="e.g. 21-CV-01"
                  className="w-full h-12 min-h-[44px] bg-slate-950 border border-slate-800 text-white text-sm rounded-xl px-3.5 focus:border-amber-500 outline-none font-mono"
                />
              </div>
            </section>

            {/* Job Card & Isolation Details */}
            <section className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3.5 shadow-sm">
              <div className="border-b border-slate-800 pb-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  Job Card & Isolation Details
                </h2>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
                  Person Requesting Job Card <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={jobCardRequester}
                  onChange={e => setJobCardRequester(e.target.value)}
                  placeholder="e.g. Sarah Jenkins"
                  className="w-full h-12 min-h-[44px] bg-slate-950 border border-slate-800 text-white text-sm rounded-xl px-3.5 focus:border-amber-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
                  Responsibility / Department <span className="text-red-400">*</span>
                </label>
                <select
                  value={jobCardResponsibility}
                  onChange={e => setJobCardResponsibility(e.target.value)}
                  className="w-full h-12 min-h-[44px] bg-slate-950 border border-slate-800 hover:border-slate-700 text-white text-xs font-bold rounded-xl px-3.5 focus:border-amber-500 outline-none cursor-pointer"
                  required
                >
                  <option value="Operations">Operations</option>
                  {Object.values(Responsibility).map(resp => (
                    <option key={resp} value={resp}>{resp}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
                  Booked Duration
                </label>
                <select
                  value={bookedDurationMinutes !== null ? bookedDurationMinutes : ''}
                  onChange={e => {
                    const val = e.target.value;
                    setBookedDurationMinutes(val === '' ? null : Number(val));
                  }}
                  className="w-full h-12 min-h-[44px] bg-slate-950 border border-slate-800 hover:border-slate-700 text-white text-xs font-bold rounded-xl px-3.5 focus:border-amber-500 outline-none cursor-pointer"
                >
                  <option value="">Unspecified</option>
                  <option value="-1">Out of Production</option>
                  <option value="30">30 minutes</option>
                  <option value="60">60 minutes</option>
                  <option value="120">120 minutes</option>
                  <option value="240">240 minutes</option>
                  <option value="480">480 minutes</option>
                  <option value="720">720 minutes</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
                  Isolation Comments / Scope
                </label>
                <textarea
                  value={jobCardComments}
                  onChange={e => setJobCardComments(e.target.value)}
                  placeholder="Describe electrical / mechanical isolation requirements..."
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 text-white text-sm rounded-xl p-3 focus:border-amber-500 outline-none leading-relaxed resize-none"
                />
              </div>
            </section>

            {/* Your Details (Reporter) */}
            <section className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3.5 shadow-sm">
              <div className="border-b border-slate-800 pb-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-amber-400" />
                  Your Details (Reporter)
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
                    Your Full Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={jobCardRequester}
                    onChange={e => setJobCardRequester(e.target.value)}
                    placeholder="e.g. John Khumalo"
                    className="w-full h-12 min-h-[44px] bg-slate-950 border border-slate-800 text-white text-sm rounded-xl px-3.5 focus:border-amber-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
                    Employee Number / ID
                  </label>
                  <input
                    type="text"
                    value={employeeNumber}
                    onChange={e => setEmployeeNumber(e.target.value)}
                    placeholder="e.g. 548201"
                    className="w-full h-12 min-h-[44px] bg-slate-950 border border-slate-800 text-white text-sm rounded-xl px-3.5 focus:border-amber-500 outline-none font-mono"
                  />
                </div>
              </div>
            </section>

            {/* Submit Action Button (Sticky Bottom Container) */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent z-40">
              <div className="max-w-lg mx-auto">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-13 min-h-[48px] bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-base font-bold rounded-2xl flex items-center justify-center gap-2.5 shadow-xl shadow-amber-600/25 active:scale-[0.98] transition cursor-pointer tracking-wide uppercase"
                >
                  {submitting ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Requesting Isolation...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-5 h-5" />
                      <span>Request Job Card / Isolation</span>
                    </>
                  )}
                </button>
              </div>
            </div>

          </form>
        )}

      </main>

      {/* PWA / iOS Install Instruction Modal */}
      {showInstallModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 bg-blue-500/20 border border-blue-500/40 text-blue-400 rounded-full flex items-center justify-center mx-auto">
              <Smartphone className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">Add to Mobile Home Screen</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              To create a direct shortcut to this Field Portal on your device:
            </p>
            <div className="bg-slate-950 p-3 rounded-xl text-left text-xs text-slate-300 space-y-2 border border-slate-800">
              <p>🍎 <strong>iOS Safari:</strong> Tap the <span className="text-blue-400 font-bold">Share</span> button and select <span className="text-white font-bold">"Add to Home Screen"</span>.</p>
              <p>🤖 <strong>Android Chrome:</strong> Tap the <span className="text-blue-400 font-bold">Menu (3 dots)</span> and select <span className="text-white font-bold">"Install app"</span> or <span className="text-white font-bold">"Add to Home screen"</span>.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowInstallModal(false)}
              className="w-full h-11 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition cursor-pointer"
            >
              Got It
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default FieldReportPortal;
