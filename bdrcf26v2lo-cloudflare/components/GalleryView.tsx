import React, { useState, useMemo, useEffect } from 'react';
import { BreakdownReport, User, WorkGroup } from '../types';
import { Image as ImageIcon, Search, Filter, Calendar, MapPin, Tag, AlertTriangle, ExternalLink, X } from 'lucide-react';
import EquipmentOverviewModal from './modals/EquipmentOverviewModal';

interface GalleryViewProps {
  reports: BreakdownReport[];
  user: User;
  workGroups: WorkGroup[];
  updateReport: (reportId: string, updates: Partial<BreakdownReport>) => void;
}

export const GalleryView: React.FC<GalleryViewProps> = ({
  reports,
  user,
  workGroups,
  updateReport,
}) => {
  const [selectedArea, setSelectedArea] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedImage, setSelectedImage] = useState<{ url: string; report: BreakdownReport } | null>(null);
  const [overviewReport, setOverviewReport] = useState<BreakdownReport | null>(null);
  const [isOverviewOpen, setIsOverviewOpen] = useState(false);

  // Flatten reports into image items
  const galleryItems = useMemo(() => {
    const items: { id: string; url: string; report: BreakdownReport; timestamp: string }[] = [];
    reports.forEach(r => {
      if (r.defectImages && r.defectImages.length > 0) {
        r.defectImages.forEach((imgUrl, idx) => {
          items.push({
            id: `${r.id}-img-${idx}`,
            url: imgUrl,
            report: r,
            timestamp: r.reportingTime
          });
        });
      }
      // Also include comment images if any
      if (r.comments) {
        r.comments.forEach((c, cIdx) => {
          if (c.commentImage) {
            items.push({
              id: `${r.id}-comment-${cIdx}`,
              url: c.commentImage,
              report: r,
              timestamp: c.timestamp
            });
          }
        });
      }
    });
    // Sort newest first
    return items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [reports]);

  // Check if navigating from a specific report
  useEffect(() => {
    const targetId = localStorage.getItem('gallery_target_report_id');
    if (targetId) {
      localStorage.removeItem('gallery_target_report_id');
      const foundItem = galleryItems.find(item => item.report.id === targetId);
      if (foundItem) {
        setSelectedImage(foundItem);
      }
    }
  }, [galleryItems]);

  // Filter items
  const filteredItems = useMemo(() => {
    return galleryItems.filter(item => {
      const r = item.report;
      const matchesArea = selectedArea === 'All' || r.workGroup.toLowerCase() === selectedArea.toLowerCase();
      const matchesStatus = selectedStatus === 'All' || r.status === selectedStatus;
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q || 
        r.equipment.toLowerCase().includes(q) || 
        r.equipmentNumber.toLowerCase().includes(q) || 
        r.reportedFault.toLowerCase().includes(q) ||
        r.workGroup.toLowerCase().includes(q);

      return matchesArea && matchesStatus && matchesSearch;
    });
  }, [galleryItems, selectedArea, selectedStatus, searchQuery]);

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 p-4 sm:p-6 overflow-hidden">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 bg-slate-900/80 p-4 rounded-xl border border-slate-800 shadow-lg">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <ImageIcon className="w-6 h-6 text-teal-400" />
            Equipment Photo & Evidence Gallery
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Visual inspection logs and defect thumbnails across all plant areas ({filteredItems.length} images found)
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Search */}
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search equipment or fault..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-64 bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Area Filter */}
          <select
            value={selectedArea}
            onChange={(e) => setSelectedArea(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="All">All Areas</option>
            {workGroups.map(wg => (
              <option key={wg.id} value={wg.name}>{wg.name}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
      </div>

      {/* Gallery Grid */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1">
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-500 bg-slate-900/40 rounded-xl border border-slate-800">
            <ImageIcon className="w-12 h-12 mb-2 text-slate-600 animate-pulse" />
            <p className="text-sm font-semibold">No inspection images match your current filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredItems.map(item => (
              <div
                key={item.id}
                onClick={() => setSelectedImage(item)}
                className="group relative bg-slate-900 rounded-xl overflow-hidden border border-slate-800 hover:border-teal-500/50 transition-all duration-200 shadow-md hover:shadow-teal-500/10 cursor-pointer flex flex-col"
              >
                {/* Thumbnail */}
                <div className="aspect-square bg-slate-950 overflow-hidden relative">
                  <img
                    src={item.url}
                    alt={item.report.equipment}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2.5">
                    <span className="text-[10px] font-bold text-white bg-teal-600/90 px-2 py-0.5 rounded shadow">
                      Click to Enlarge
                    </span>
                  </div>
                </div>

                {/* Metadata */}
                <div className="p-2.5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-xs font-bold text-teal-300 truncate">{item.report.equipment}</span>
                      <span className="text-[10px] font-mono text-slate-400">{item.report.equipmentNumber}</span>
                    </div>
                    <p className="text-[11px] text-slate-300 line-clamp-2 mb-2">{item.report.reportedFault}</p>
                  </div>
                  
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[10px] text-slate-400">
                    <span className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-300 font-medium">{item.report.workGroup}</span>
                    <span className="font-mono">{new Date(item.timestamp).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox / Modal */}
      {selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-teal-400" />
                <span className="font-bold text-white text-sm">{selectedImage.report.equipment} ({selectedImage.report.equipmentNumber})</span>
                <span className="text-xs bg-teal-950 text-teal-300 px-2 py-0.5 rounded font-medium border border-teal-800">{selectedImage.report.workGroup}</span>
              </div>
              <button
                onClick={() => setSelectedImage(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div className="bg-slate-950 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center max-h-[60vh]">
                <img
                  src={selectedImage.url}
                  alt={selectedImage.report.equipment}
                  className="max-h-[60vh] object-contain w-full"
                />
              </div>

              <div className="space-y-4 text-slate-300 text-xs">
                <div>
                  <span className="text-slate-500 uppercase tracking-wider text-[10px] font-bold block mb-1">Reported Fault</span>
                  <p className="text-white text-sm font-medium bg-slate-950 p-3 rounded-xl border border-slate-800">{selectedImage.report.reportedFault}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-500 uppercase tracking-wider text-[10px] font-bold block mb-0.5">Status</span>
                    <span className="font-bold text-teal-300">{selectedImage.report.status}</span>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-500 uppercase tracking-wider text-[10px] font-bold block mb-0.5">Reporting Time</span>
                    <span className="font-mono text-slate-200">{new Date(selectedImage.report.reportingTime).toLocaleString()}</span>
                  </div>
                </div>

                {selectedImage.report.resolutionNotes && (
                  <div>
                    <span className="text-slate-500 uppercase tracking-wider text-[10px] font-bold block mb-1">Resolution Notes</span>
                    <p className="text-slate-200 bg-slate-950 p-3 rounded-xl border border-slate-800">{selectedImage.report.resolutionNotes}</p>
                  </div>
                )}

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => {
                      const rep = selectedImage.report;
                      setSelectedImage(null);
                      setOverviewReport(rep);
                      setIsOverviewOpen(true);
                    }}
                    className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-500 text-white font-bold px-4 py-2 rounded-xl transition shadow-lg"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open Full Equipment Overview
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Equipment Overview Modal */}
      {isOverviewOpen && overviewReport && (
        <EquipmentOverviewModal
          isOpen={isOverviewOpen}
          onClose={() => { setIsOverviewOpen(false); setOverviewReport(null); }}
          report={overviewReport}
          currentUser={user}
          onUpdateReport={updateReport}
        />
      )}
    </div>
  );
};
