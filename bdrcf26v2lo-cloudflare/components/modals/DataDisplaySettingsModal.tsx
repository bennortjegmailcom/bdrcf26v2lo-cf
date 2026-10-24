import React from 'react';
import { User } from '../../types';

interface DataDisplaySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onUpdateUser: (userId: string, updates: Partial<User>) => void;
}

const DataDisplaySettingsModal: React.FC<DataDisplaySettingsModalProps> = ({ isOpen, onClose, user, onUpdateUser }) => {
  if (!isOpen) return null;

  const handleHoursChange = (hours: number) => {
    onUpdateUser(user.id, { hoursToShow: hours });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-gray-700 flex justify-between items-center">
          <h3 className="text-xl font-bold text-white">Data Display Settings</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-6">
          <label className="block text-sm font-medium text-gray-400 mb-4">Reports Range (last X hours)</label>
          <div className="flex gap-2">
            {[1, 4, 8, 12].map((h) => (
              <button
                key={h}
                onClick={() => handleHoursChange(h)}
                className={`flex-1 py-2 rounded-lg font-bold transition-all ${
                  (user.hoursToShow || 4) === h 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {h}h
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 bg-gray-900/50 border-t border-gray-700 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors shadow-lg"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default DataDisplaySettingsModal;
