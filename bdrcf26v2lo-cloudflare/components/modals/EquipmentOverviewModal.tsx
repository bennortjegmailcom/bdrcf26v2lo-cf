import React, { useState, useEffect } from 'react';
import { BreakdownReport, User, Status } from '../../types';
import { INITIAL_REPORTS } from '../../constants';
import { calculateDuration, formatDateTime } from '../../utils';
import { X, Calendar, Clock, AlertTriangle, Shield, CheckCircle, FileText, ChevronRight, MessageSquare } from 'lucide-react';
import Badge from '../ui/Badge';

interface EquipmentOverviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: BreakdownReport | null;
  currentUser: User;
  onOpenComments?: (report: BreakdownReport) => void;
  onEdit?: (report: BreakdownReport) => void;
}

const EquipmentOverviewModal: React.FC<EquipmentOverviewModalProps> = ({
  isOpen,
  onClose,
  report,
  currentUser,
  onOpenComments,
  onEdit
}) => {
  const [history, setHistory] = useState<BreakdownReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePreviewImage, setActivePreviewImage] = useState<string | null>(null);

  // Fetch 7-day breakdown history for this specific equipment
  useEffect(() => {
    if (!isOpen || !report) return;

    const fetchHistory = async () => {
      setLoading(true);
      try {
        const cached = JSON.parse(localStorage.getItem('cache_reports') || JSON.stringify(INITIAL_REPORTS));
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const filtered = cached.filter((r: BreakdownReport) => 
          r.equipment === report.equipment && new Date(r.reportingTime).getTime() >= sevenDaysAgo.getTime()
        );
        
        filtered.sort((a: BreakdownReport, b: BreakdownReport) => new Date(b.reportingTime).getTime() - new Date(a.reportingTime).getTime());
        setHistory(filtered);
      } catch (err) {
        console.error("Failed to load 7-day equipment history:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
    setActivePreviewImage(null);
  }, [isOpen, report?.id, report?.equipment]);

  if (!isOpen || !report) return null;

  // Calculate some analytics
  const totalIncidentsIn7Days = history.length;
  const unresolvedIncidents = history.filter(h => h.status !== Status.COMPLETED).length;

  return (
    <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-gray-900 border border-gray-800 rounded-xl shadow-2xl w-full max-w-5xl overflow-hidden animate-scaleIn my-8">
        
        {/* Header - Brand style with single line unboxed metadata */}
        <div className="bg-gray-950 p-4 border-b border-gray-800 flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-bold text-white tracking-tight">{report.equipment}</h3>
              <span className="text-gray-400 font-mono text-sm">{report.equipmentNumber}</span>
              <div className="ml-2 flex items-center gap-1.5">
                <Badge status={report.status} />
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${
                  report.urgency >= 8 ? 'bg-red-600' : report.urgency >= 5 ? 'bg-yellow-500' : 'bg-green-600'
                }`}>
                  {report.urgency}
                </span>
                {(report.source === 'field-report' || report.isFieldReport) && (
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-amber-950/80 border border-amber-500/40 text-amber-300 rounded-full">
                    📱 Field QR Report
                  </span>
                )}
                {report.safetyConcern && (
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-red-950/80 border border-red-500/50 text-red-300 rounded-full">
                    ⚠️ Safety Concern
                  </span>
                )}
              </div>
            </div>
            
            {/* Unboxed Metadata list with quiet separators */}
            <div className="flex items-center gap-2 text-xs text-gray-500 mt-1.5">
              <span>Group: {report.workGroup}</span>
              <span aria-hidden="true" className="text-gray-700">·</span>
              <span>By: {report.reporter?.name || 'Unknown'} {report.reporter?.employeeNumber ? `(#${report.reporter.employeeNumber})` : ''}</span>
              <span aria-hidden="true" className="text-gray-700">·</span>
              <span>Reported: {formatDateTime(report.reportingTime)}</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Mini-Dashboard Statistics Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 border-b border-gray-800 bg-gray-950/40">
          <div className="p-4 border-r border-gray-800">
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">7-Day Incidents</div>
            <div className="text-2xl font-bold font-mono text-blue-400 mt-1 tabular-nums">{totalIncidentsIn7Days}</div>
          </div>
          <div className="p-4 border-r border-gray-800">
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Active Failures</div>
            <div className="text-2xl font-bold font-mono text-amber-500 mt-1 tabular-nums">{unresolvedIncidents}</div>
          </div>
          <div className="p-4 border-r border-gray-800">
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Active Urgency</div>
            <div className="text-2xl font-bold font-mono text-red-500 mt-1 tabular-nums">{report.urgency}/10</div>
          </div>
          <div className="p-4">
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Downtime Duration</div>
            <div className="text-sm font-semibold font-mono text-green-400 mt-2 truncate">
              {calculateDuration(report.reportingTime, report.resolutionTime)}
            </div>
          </div>
        </div>

        {/* Main Body - Two Column layout in same style as production dashboards */}
        <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
          
          {/* Left Column - All Report Info & Defect Gallery */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Defect Overview Panel */}
            <div className="space-y-4">
              <div className="border border-gray-800 rounded-lg p-4 bg-gray-950/20 space-y-3">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Reported Fault</h4>
                    <p className="text-sm font-medium text-white mt-1 leading-relaxed">{report.reportedFault}</p>
                  </div>
                </div>

                {report.details && (
                  <div className="flex items-start gap-3 border-t border-gray-800/60 pt-3">
                    <FileText className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Details / Location</h4>
                      <p className="text-sm text-gray-300 mt-1 leading-relaxed">{report.details}</p>
                    </div>
                  </div>
                )}

                {report.operatorName && (
                  <div className="flex items-start gap-3 border-t border-gray-800/60 pt-3 text-xs text-gray-400">
                    <Shield className="w-4 h-4 text-blue-400 shrink-0" />
                    <span>Active Operator Team Member: <strong className="text-white">{report.operatorName}</strong></span>
                  </div>
                )}
              </div>

              {/* Maintenance & Resolution Details */}
              <div className="border border-gray-800 rounded-lg p-4 bg-gray-950/20 space-y-3">
                <div className="flex items-start gap-3">
                  <Clock className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Assignments & Bookings</h4>
                    {report.assignments && report.assignments.length > 0 ? (
                      <div className="mt-1.5 space-y-1.5">
                        {report.assignments.map((a, idx) => (
                          <div key={idx} className="text-xs text-gray-300">
                            · <strong className="text-white">{a.artisanName}</strong> ({a.responsibility}{a.specialty ? ` - ${a.specialty}` : ''})
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500 italic mt-1">No artisan assigned to this breakdown yet.</p>
                    )}
                  </div>
                </div>

                {(report.whatWasWrong || report.resolutionNotes || report.resolutionStatus) && (
                  <div className="flex items-start gap-3 border-t border-gray-800/60 pt-3">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Fault Found & Resolution Notes</h4>
                      <div className="mt-1.5 space-y-1.5">
                        {report.resolutionStatus && (
                          <p className="text-xs">
                            Status Outcome: <span className="text-purple-400 font-semibold">{report.resolutionStatus}</span>
                          </p>
                        )}
                        {report.whatWasWrong && (
                          <p className="text-xs text-gray-300">
                            Fault Found: <span className="text-white font-medium">{report.whatWasWrong}</span>
                          </p>
                        )}
                        {report.resolutionNotes && (
                          <p className="text-xs text-gray-400 bg-gray-950/50 p-2 rounded border border-gray-800/40">
                            {report.resolutionNotes}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Voice Note Audio Player */}
            {report.audioNote && (
              <div className="border border-rose-900/60 bg-rose-950/20 rounded-lg p-3.5 space-y-2">
                <h4 className="text-xs font-bold text-rose-300 uppercase tracking-wider flex items-center gap-1.5">
                  <span>🎙️ Voice Note Recording</span>
                </h4>
                <audio src={report.audioNote} controls className="w-full h-8" />
              </div>
            )}

            {/* Defect Images Gallery */}
            <div>
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Defect Gallery</h4>
              {report.defectImages && report.defectImages.length > 0 ? (
                <div className="space-y-4">
                  {/* Thumbnail Scroll grid */}
                  <div className="flex flex-wrap gap-3 p-2 bg-gray-950/40 rounded-lg border border-gray-800">
                    {report.defectImages.map((img, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setActivePreviewImage(activePreviewImage === img ? null : img)}
                        className={`relative w-20 h-20 bg-gray-950 rounded-lg overflow-hidden border transition ${
                          activePreviewImage === img ? 'border-blue-500 scale-105 shadow-md shadow-blue-500/20' : 'border-gray-800 hover:border-gray-600'
                        }`}
                      >
                        <img src={img} alt={`defect-gallery-${idx}`} className="object-cover w-full h-full" />
                      </button>
                    ))}
                  </div>

                  {/* Inline Expanded Preview (Lightbox) */}
                  {activePreviewImage && (
                    <div className="relative border border-gray-800 bg-gray-950 rounded-lg overflow-hidden max-h-[350px] flex items-center justify-center animate-fadeIn">
                      <img src={activePreviewImage} alt="Expanded preview" className="object-contain max-h-[350px] w-full" />
                      <button
                        type="button"
                        onClick={() => setActivePreviewImage(null)}
                        className="absolute top-2 right-2 p-1 bg-black/60 hover:bg-black text-white rounded-full"
                        title="Close preview"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-gray-500 italic p-4 bg-gray-950/20 rounded-lg border border-gray-800/50">
                  No visual defect evidence uploaded for this incident.
                </div>
              )}
            </div>

          </div>

          {/* Right Column - 7-Day History Timeline */}
          <div className="lg:col-span-5 border-t lg:border-t-0 lg:border-l border-gray-800 pt-6 lg:pt-0 lg:pl-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center">
                <Calendar className="w-4 h-4 mr-1.5 text-blue-400" />
                7-Day History Timeline
              </h4>
              <span className="text-[10px] bg-gray-800 text-gray-300 font-mono px-1.5 py-0.5 rounded">
                7 Days
              </span>
            </div>

            {loading ? (
              <div className="text-center py-12 text-gray-500 text-xs">Loading history...</div>
            ) : history.length === 0 ? (
              <div className="text-center py-12 text-gray-500 text-xs italic">No history found in the last 7 days.</div>
            ) : (
              <div className="space-y-4 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-800">
                {history.map((hist) => {
                  const isCurrent = hist.id === report.id;
                  const isActiveStatus = hist.status !== Status.COMPLETED;

                  return (
                    <div key={hist.id} className={`flex items-start gap-4 p-2.5 rounded-lg border transition ${
                      isCurrent 
                        ? 'bg-blue-950/20 border-blue-500/40 shadow-sm shadow-blue-500/5' 
                        : 'border-transparent hover:bg-gray-800/30'
                    }`}>
                      {/* Timeline Dot Indicator */}
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 z-10 font-bold text-xs ${
                        isCurrent 
                          ? 'bg-blue-600 text-white animate-pulse' 
                          : isActiveStatus 
                            ? 'bg-amber-600 text-white' 
                            : 'bg-gray-800 text-gray-400'
                      }`}>
                        {hist.urgency}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold text-gray-400 font-mono">
                            {new Date(hist.reportingTime).toLocaleDateString([], { month: 'short', day: 'numeric' })} · {new Date(hist.reportingTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                          </span>
                          {isCurrent && (
                            <span className="text-[8px] bg-blue-600 text-white font-black uppercase px-1 rounded">Active</span>
                          )}
                        </div>

                        <p className="text-xs text-white font-medium mt-1 truncate" title={hist.reportedFault}>
                          {hist.reportedFault}
                        </p>

                        <div className="flex items-center justify-between text-[10px] text-gray-500 mt-1">
                          <span>
                            {hist.resolutionStatus ? `Status: ${hist.resolutionStatus}` : `Status: ${hist.status}`}
                          </span>
                          <span className="font-mono text-gray-400">
                            {calculateDuration(hist.reportingTime, hist.resolutionTime)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Bottom Actions Bar */}
        <div className="bg-gray-950 px-6 py-4 border-t border-gray-800 flex justify-between gap-3 flex-wrap">
          <div className="flex gap-2.5">
            {onOpenComments && (
              <button
                type="button"
                onClick={() => {
                  onOpenComments(report);
                  onClose();
                }}
                className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white font-bold py-2 px-4 rounded-lg text-xs transition flex items-center gap-2"
              >
                <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                Open Report Comments
              </button>
            )}
            {onEdit && (
              <button
                type="button"
                onClick={() => {
                  onEdit(report);
                  onClose();
                }}
                className="bg-blue-600/90 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg text-xs transition flex items-center gap-1.5"
              >
                Edit / Resolve Report
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-lg text-xs transition border border-gray-700"
          >
            Close Overview
          </button>
        </div>

      </div>
    </div>
  );
};

export default EquipmentOverviewModal;
