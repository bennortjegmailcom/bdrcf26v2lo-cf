import React, { useState } from 'react';
import { BreakdownReport, Status } from '../../types';
import { X, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';

interface UnclosedShiftReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
  reports: BreakdownReport[];
  onAck: (reportId: string) => void;
  onEnd: (reportId: string) => void;
}

const UnclosedShiftReportsModal: React.FC<UnclosedShiftReportsModalProps> = ({
  isOpen,
  onClose,
  reports,
  onAck,
  onEnd,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl shadow-2xl">
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <AlertTriangle className="text-amber-500" />
            Unclosed Reports from Previous Shift
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
          {reports.map((report) => (
            <div key={report.id} className="bg-gray-800 p-3 rounded-lg border border-gray-700">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="text-white font-bold">{report.equipment} ({report.equipmentNumber})</h3>
                  <p className="text-gray-400 text-sm">{report.reportedFault}</p>
                </div>
                <span className="text-xs text-gray-500">Reported: {new Date(report.reportingTime).toLocaleTimeString()}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onAck(report.id)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-1.5 rounded text-sm font-medium"
                >
                  Acknowledge
                </button>
                <button
                  onClick={() => onEnd(report.id)}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-1.5 rounded text-sm font-medium"
                >
                  End Shift Report
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default UnclosedShiftReportsModal;
