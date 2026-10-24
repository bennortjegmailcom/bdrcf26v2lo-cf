
import React, { useState, useRef, useEffect } from 'react';
import { ChangeLogEntry } from '../../types';

interface HistoryCellProps {
  children: React.ReactNode;
  field: string;
  changeLog?: ChangeLogEntry[];
  isAdmin: boolean;
}

const HistoryCell: React.FC<HistoryCellProps> = ({ children, field, changeLog, isAdmin }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isAdmin || !changeLog) {
    return <>{children}</>;
  }

  const fieldHistory = changeLog
    .filter(entry => entry.field === field)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  if (fieldHistory.length === 0) {
    return <>{children}</>;
  }

  const showPopover = isOpen || isHovered;

  return (
    <div 
        className="relative h-full w-full flex items-center group/history"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
    >
      <div className="w-full">{children}</div>
      
      {/* Orange Dot */}
      <button
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
        className="absolute top-0 right-0 -mt-1 -mr-1 w-2 h-2 bg-orange-500 rounded-full cursor-pointer hover:scale-150 transition-transform z-10 print:hidden shadow-sm"
        title="View changes"
      />

      {/* History Popover */}
      {showPopover && (
        <div 
            ref={popoverRef}
            className="absolute left-0 top-full mt-1 w-64 bg-white text-gray-900 text-xs rounded shadow-2xl z-50 border border-gray-300 pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
        >
          <div className="p-2 bg-gray-200 border-b border-gray-300 font-bold flex justify-between items-center rounded-t">
            <span>Change History</span>
            <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-gray-800 text-lg leading-none">&times;</button>
          </div>
          <div className="max-h-40 overflow-y-auto">
            {fieldHistory.map((entry, idx) => (
              <div key={idx} className="p-2 border-b border-gray-100 last:border-0 hover:bg-gray-50 bg-white">
                 <div className="flex justify-between text-gray-500 mb-1 text-[10px]">
                    <span>{new Date(entry.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'})}</span>
                    <span className="font-semibold text-gray-700">{entry.changedBy}</span>
                 </div>
                 <div className="font-mono text-gray-700 text-[10px] break-words whitespace-normal">
                    <span className="line-through text-red-500 mr-1">{entry.oldValue || 'None'}</span>
                    &rarr;
                    <span className="text-green-600 ml-1">{entry.newValue || 'None'}</span>
                 </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoryCell;
