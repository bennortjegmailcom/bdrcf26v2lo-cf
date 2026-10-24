import React, { useState, useEffect } from 'react';
import { 
  X, 
  FileText, 
  ShieldCheck, 
  Printer, 
  CheckCircle2, 
  AlertTriangle, 
  Lock, 
  Database, 
  Users, 
  HardHat, 
  Clock, 
  Server,
  Layers,
  FileCheck
} from 'lucide-react';

interface TermsAndPrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'terms' | 'privacy';
}

export const TermsAndPrivacyModal: React.FC<TermsAndPrivacyModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'terms'
}) => {
  const [activeTab, setActiveTab] = useState<'terms' | 'privacy'>(initialTab);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-4xl bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-gray-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header with Tabs and Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between px-5 py-3.5 border-b border-gray-800 bg-gray-950/80 gap-3">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-gray-900 border border-gray-800 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('terms')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'terms'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-950'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Terms & Conditions</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('privacy')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'privacy'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-950'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Privacy Policy</span>
            </button>
          </div>

          {/* Action buttons (Print & Close) */}
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-300 bg-gray-800/90 border border-gray-700 hover:bg-gray-700 hover:text-white transition-colors"
              title="Print document"
            >
              <Printer className="w-3.5 h-3.5 text-gray-400" />
              <span>Print Document</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              title="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Document Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs leading-relaxed text-gray-300">
          {activeTab === 'terms' ? (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Document Banner */}
              <div className="bg-blue-950/30 border border-blue-900/50 p-4 rounded-xl flex items-start gap-3">
                <FileCheck className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-white mb-1">
                    Operational Governance & System Terms of Use
                  </h3>
                  <p className="text-gray-400">
                    Applicable to all plant personnel, engineering supervisors, dispatch coordinators, and maintenance contractors operating the Breakdown Reporter application.
                  </p>
                </div>
              </div>

              {/* Section 1 */}
              <section className="space-y-2">
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-600/30 text-blue-400 text-xs font-mono">1</span>
                  <h4>System Purpose & Operational Scope</h4>
                </div>
                <div className="pl-7 space-y-1.5 text-gray-300">
                  <p>
                    The Breakdown Reporter (BDR) platform provides real-time equipment breakdown logging, dispatch coordination, maintenance workflow escalation, and shift handover auditing across industrial operations (including Exxaro, Matimba, IPC, and GG production complexes).
                  </p>
                  <p>
                    All data recorded within the system directly impacts plant availability metrics, statutory safety compliance, and maintenance resource deployment. Use of this application implies strict adherence to established engineering operating standards.
                  </p>
                </div>
              </section>

              {/* Section 2 */}
              <section className="space-y-2">
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-600/30 text-blue-400 text-xs font-mono">2</span>
                  <h4>Role-Based Responsibilities & Accountability</h4>
                </div>
                <div className="pl-7 grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  <div className="p-3 rounded-xl bg-gray-800/60 border border-gray-700/60">
                    <div className="font-semibold text-blue-300 mb-1 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" />
                      Reporter
                    </div>
                    <p className="text-gray-400">
                      Must log incidents immediately upon occurrence. Responsible for accurate functional group (FG) identification, precise breakdown descriptions, and prompt timestamp capture.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-gray-800/60 border border-gray-700/60">
                    <div className="font-semibold text-emerald-300 mb-1 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5" />
                      Coordinator
                    </div>
                    <p className="text-gray-400">
                      Performs shift intake triage, validates incoming reports, categorizes failure disciplines, dispatches relevant maintenance workgroups, and coordinates urgent bottleneck responses.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-gray-800/60 border border-gray-700/60">
                    <div className="font-semibold text-amber-300 mb-1 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      Scheduler
                    </div>
                    <p className="text-gray-400">
                      Coordinates planned vs. unplanned breakdown slots, aligns artisan capacity, ensures spare part staging, and works to minimize production downtime windows.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-gray-800/60 border border-gray-700/60">
                    <div className="font-semibold text-purple-300 mb-1 flex items-center gap-1.5">
                      <HardHat className="w-3.5 h-3.5" />
                      Supervisor
                    </div>
                    <p className="text-gray-400">
                      Provides engineering and discipline oversight (Electrical, Mechanical, Instrumentation, Tech). Reviews diagnostic accuracy, audits shift handovers, and approves major resolutions.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-gray-800/60 border border-gray-700/60">
                    <div className="font-semibold text-cyan-300 mb-1 flex items-center gap-1.5">
                      <HardHat className="w-3.5 h-3.5" />
                      Foreman
                    </div>
                    <p className="text-gray-400">
                      Oversees on-shift execution, assigns artisans to active job tickets, validates root causes, signs off on safety clearances, and completes rigorous shift handover documentation.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-gray-800/60 border border-gray-700/60">
                    <div className="font-semibold text-red-300 mb-1 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Administrator & Super User
                    </div>
                    <p className="text-gray-400">
                      Governs user access controls, configures operational workgroups, maintains system integrity, conducts compliance reviews, and supervises system audit logs.
                    </p>
                  </div>
                </div>
              </section>

              {/* Section 3 */}
              <section className="space-y-2">
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-600/30 text-blue-400 text-xs font-mono">3</span>
                  <h4>Equipment Breakdown Logging Integrity</h4>
                </div>
                <div className="pl-7 space-y-1.5 text-gray-300">
                  <p>
                    All breakdown entries must represent truthful, factual field conditions. Retroactive falsification of start times, artificial manipulation of resolution timestamps, or suppression of reportable incidents constitutes a critical breach of operational policy.
                  </p>
                  <p>
                    Equipment statuses (Pending, In Progress, Resolved, Escalated) must be updated contemporaneously as physical maintenance work unfolds.
                  </p>
                </div>
              </section>

              {/* Section 4 */}
              <section className="space-y-2">
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-600/30 text-blue-400 text-xs font-mono">4</span>
                  <h4>Immutable Audit Trails & Compliance</h4>
                </div>
                <div className="pl-7 space-y-1.5 text-gray-300">
                  <p>
                    Every state transition, artisan reassignment, resolution comment, and supervisor authorization creates a cryptographically timestamped audit log entry.
                  </p>
                  <p>
                    Audit logs are retained for statutory review and internal performance evaluations. Changes cannot be erased or obscured by standard user roles.
                  </p>
                </div>
              </section>

              {/* Section 5 */}
              <section className="space-y-2">
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-red-600/30 text-red-400 text-xs font-mono">5</span>
                  <h4>Lockout / Tagout (LOTO) Safety Protocol Adherence</h4>
                </div>
                <div className="pl-7 bg-red-950/20 border border-red-900/40 p-3.5 rounded-xl space-y-2 text-gray-300">
                  <div className="flex items-center gap-2 text-red-400 font-semibold text-xs">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>MANDATORY LIFE-SAVING RULE</span>
                  </div>
                  <p>
                    Before any physical inspection, maintenance, or artisan dispatch to live equipment, full Lockout / Tagout (LOTO) isolation protocols must be physically confirmed.
                  </p>
                  <ul className="list-disc pl-4 space-y-1 text-gray-400">
                    <li>Positive zero-energy state verification must precede job ticket commencement.</li>
                    <li>Personal safety padlocks and danger tags must be applied by each artisan on-site.</li>
                    <li>Re-energization authorization requires formal joint clearance from the designated Foreman and shift Supervisor.</li>
                  </ul>
                </div>
              </section>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Document Banner */}
              <div className="bg-emerald-950/30 border border-emerald-900/50 p-4 rounded-xl flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-white mb-1">
                    Data Privacy & Security Policy
                  </h3>
                  <p className="text-gray-400">
                    Outlines information collection, role-based database protections, on-device caching, and industrial data retention standards.
                  </p>
                </div>
              </div>

              {/* Section 1 */}
              <section className="space-y-2">
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-600/30 text-emerald-400 text-xs font-mono">1</span>
                  <h4>Operational Information Collected</h4>
                </div>
                <div className="pl-7 space-y-2 text-gray-300">
                  <p>
                    The Breakdown Reporter processes operational data necessary to manage plant maintenance and safety workflows:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    <div className="p-3 rounded-lg bg-gray-800/50 border border-gray-700/50">
                      <div className="font-semibold text-gray-200 mb-1">Personnel Identifiers</div>
                      <p className="text-gray-400">Employee badge numbers, full operational names, workgroup disciplines, and shift designations.</p>
                    </div>
                    <div className="p-3 rounded-lg bg-gray-800/50 border border-gray-700/50">
                      <div className="font-semibold text-gray-200 mb-1">Maintenance & Downtime Logs</div>
                      <p className="text-gray-400">Functional group numbers, failure descriptions, timestamped status transitions, and resolution comments.</p>
                    </div>
                    <div className="p-3 rounded-lg bg-gray-800/50 border border-gray-700/50">
                      <div className="font-semibold text-gray-200 mb-1">Field Audio & Photo Evidence</div>
                      <p className="text-gray-400">On-site voice notes, audio memos, and photographic evidence submitted for diagnostic verification.</p>
                    </div>
                    <div className="p-3 rounded-lg bg-gray-800/50 border border-gray-700/50">
                      <div className="font-semibold text-gray-200 mb-1">System & Diagnostic Metadata</div>
                      <p className="text-gray-400">Client synchronization timestamps, network connectivity status, and offline queue state.</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Section 2 */}
              <section className="space-y-2">
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-600/30 text-emerald-400 text-xs font-mono">2</span>
                  <h4>Role-Based Access Control & Database Security</h4>
                </div>
                <div className="pl-7 space-y-1.5 text-gray-300">
                  <p>
                    All central records reside in authenticated Google Cloud Firestore infrastructure and Cloudflare Worker API proxies. Access is governed under strict Role-Based Access Control (RBAC):
                  </p>
                  <ul className="list-disc pl-4 space-y-1 text-gray-400">
                    <li>Non-administrative personnel may only view records relevant to their assigned workgroups and operational disciplines.</li>
                    <li>Administrative privileges are strictly restricted to vetted operational controllers.</li>
                    <li>All data in transit is encrypted using industry-standard TLS 1.3 cryptographic protocols.</li>
                  </ul>
                </div>
              </section>

              {/* Section 3 */}
              <section className="space-y-2">
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-600/30 text-emerald-400 text-xs font-mono">3</span>
                  <h4>Local Device Storage & Offline Cache</h4>
                </div>
                <div className="pl-7 space-y-1.5 text-gray-300">
                  <p>
                    Due to variable wireless connectivity across deep pit, plant, and remote dispatch areas, the application employs localized client caching (<code className="text-emerald-300 font-mono">localStorage</code> and IndexedDB cache).
                  </p>
                  <p>
                    Offline queues hold pending breakdown tickets, shift handover drafts, and voice memos securely on the local device until network connectivity is re-established, at which point records are automatically synchronized.
                  </p>
                </div>
              </section>

              {/* Section 4 */}
              <section className="space-y-2">
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-600/30 text-emerald-400 text-xs font-mono">4</span>
                  <h4>Data Retention & Archival Standards</h4>
                </div>
                <div className="pl-7 space-y-1.5 text-gray-300">
                  <p>
                    Operational breakdown reports and shift handover logs are retained in accordance with statutory mining safety regulations and corporate equipment governance schedules.
                  </p>
                  <p>
                    Superceded historical logs are systematically archived to maintain high performance while preserving complete, tamper-evident audit trails for regulatory compliance.
                  </p>
                </div>
              </section>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 bg-gray-950/90 border-t border-gray-800 flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-blue-400" />
            <span>Operational Compliance Standard • Version 2026.1</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 hover:text-white font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default TermsAndPrivacyModal;
