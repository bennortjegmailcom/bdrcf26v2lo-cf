import React, { useState, useMemo, useEffect } from 'react';
import Modal from '../ui/Modal';
import { INITIAL_WORK_GROUPS } from '../../constants';
import { User } from '../../types';
import { QrCode, Copy, Check, ExternalLink, Printer, MapPin, Sparkles } from 'lucide-react';

interface EquipmentQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: User;
  initialArea?: string;
  initialEquipment?: {
    name?: string;
    fgNumber?: string;
    area?: string;
  };
}

export const EquipmentQRModal: React.FC<EquipmentQRModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  initialArea,
  initialEquipment
}) => {
  // Load dynamic areas from cache
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

  // Determine initial preloaded area based on user workGroup or prop
  const getPreloadedArea = (): string => {
    if (initialArea && initialArea !== 'All') return initialArea;
    if (initialEquipment?.area) return initialEquipment.area;
    if (currentUser?.workGroup && currentUser.workGroup !== 'All') return currentUser.workGroup;
    try {
      const saved = localStorage.getItem('bdr_field_reporter_area');
      if (saved) return saved;
    } catch {}
    return 'GG';
  };

  const [selectedArea, setSelectedArea] = useState<string>(getPreloadedArea);
  const [copied, setCopied] = useState<boolean>(false);

  // Whenever modal opens, automatically preload the reporter's selected / assigned area
  useEffect(() => {
    if (isOpen) {
      const targetArea = getPreloadedArea();
      // Match against available workgroups if possible
      const matched = workGroupList.find(
        w => w.name.toLowerCase() === targetArea.toLowerCase()
      );
      setSelectedArea(matched ? matched.name : targetArea);
    }
  }, [isOpen, initialArea, initialEquipment, currentUser?.workGroup, workGroupList]);

  // Construct target field report URL (1 QR Code per 1 Area)
  const targetUrl = useMemo(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/field-report?area=${encodeURIComponent(selectedArea)}`;
  }, [selectedArea]);

  // SVG QR Code generator
  const qrSvgUrl = useMemo(() => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(targetUrl)}&bgcolor=ffffff&color=0f172a&margin=2`;
  }, [targetUrl]);

  const handleCopy = () => {
    navigator.clipboard.writeText(targetUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Area QR Code Generator">
      <div className="bg-gray-950 text-white rounded-xl p-4 sm:p-5 space-y-4 max-w-lg mx-auto">
        
        {/* Area Selection Only */}
        <div className="print:hidden space-y-1">
          <div className="flex justify-between items-center">
            <label className="block text-xs font-bold text-gray-400 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-blue-400" />
              Select Plant Area
            </label>
            {currentUser?.workGroup && currentUser.workGroup !== 'All' && (
              <span className="text-[10px] text-blue-400 font-semibold bg-blue-950/60 border border-blue-500/30 px-2 py-0.5 rounded-full">
                Preloaded from your profile: {currentUser.workGroup}
              </span>
            )}
          </div>
          <select
            value={selectedArea}
            onChange={e => setSelectedArea(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 text-sm font-bold rounded-lg p-2.5 text-white outline-none focus:border-blue-500 cursor-pointer"
          >
            {workGroupList.map(wg => (
              <option key={wg.id || wg.name} value={wg.name}>
                {wg.name} Area
              </option>
            ))}
          </select>
        </div>

        {/* Printable Physical Area QR Placard Card */}
        <div className="border-2 border-dashed border-gray-700 rounded-2xl p-5 bg-white text-slate-900 flex flex-col items-center text-center shadow-lg">
          
          <div className="text-[11px] font-extrabold uppercase tracking-widest bg-blue-900 text-white px-3.5 py-1 rounded-full mb-2">
            Breakdown Reporting Point
          </div>

          <h3 className="text-2xl font-black tracking-tight text-slate-950 mb-0.5">
            {selectedArea} Area
          </h3>
          
          <div className="text-xs font-semibold text-slate-500 mb-3">
            Plant Area Dispatch Placard
          </div>

          {/* QR Image */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm mb-3">
            <img 
              src={qrSvgUrl} 
              alt={`QR code for ${selectedArea} Area`}
              className="w-48 h-48 object-contain"
            />
          </div>

          <p className="text-xs text-slate-600 font-medium max-w-xs leading-relaxed">
            Scan with mobile camera to immediately book a breakdown report for <strong className="text-slate-900">{selectedArea}</strong> area.
          </p>
        </div>

        {/* Target URL Preview & Actions */}
        <div className="space-y-2 print:hidden">
          <label className="block text-xs font-bold text-gray-400">Direct QR Target URL</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={targetUrl}
              className="flex-1 bg-gray-900 border border-gray-800 text-xs font-mono text-gray-300 rounded-lg p-2.5 select-all outline-none"
            />
            <button
              type="button"
              onClick={handleCopy}
              className="px-3.5 py-2.5 bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-800 print:hidden">
          <a
            href={targetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2.5 bg-blue-600/20 border border-blue-500/40 text-blue-300 hover:bg-blue-600/30 text-xs font-bold rounded-lg flex items-center gap-1.5 transition"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Open Field Report Test</span>
          </a>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Tag</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white text-xs font-bold rounded-lg transition cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>

      </div>
    </Modal>
  );
};

export default EquipmentQRModal;
