import React from 'react';
import { User } from '../../types';

interface NotificationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onUpdateUser: (userId: string, updates: Partial<User>) => void;
}

export const NOTIFICATION_SOUNDS = [
  { id: 'chime', name: 'Chime', url: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3' },
  { id: 'ding', name: 'Ding', url: 'https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3' },
  { id: 'alert', name: 'Alert', url: 'https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3' },
];

const NotificationSettingsModal: React.FC<NotificationSettingsModalProps> = ({ isOpen, onClose, user, onUpdateUser }) => {
  if (!isOpen) return null;

  const handlePlaySound = (url: string) => {
    const audio = new Audio(url);
    audio.play().catch(err => {
      console.warn("Could not play sound preview:", err.message);
    });
  };

  const handleSelectSound = (url: string) => {
    onUpdateUser(user.id, { notificationSound: url });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-gray-700 flex justify-between items-center">
          <h3 className="text-xl font-bold text-white">Notification Settings</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-4">Choose Notification Sound</label>
            <div className="space-y-3">
              {NOTIFICATION_SOUNDS.map((sound) => (
                <div 
                  key={sound.id}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer ${
                    user.notificationSound === sound.url 
                      ? 'bg-blue-600/20 border-blue-500 text-white' 
                      : 'bg-gray-700/50 border-gray-600 text-gray-300 hover:bg-gray-700'
                  }`}
                  onClick={() => handleSelectSound(sound.url)}
                >
                  <div className="flex items-center">
                    <div className={`w-4 h-4 rounded-full border-2 mr-3 flex items-center justify-center ${
                      user.notificationSound === sound.url ? 'border-white' : 'border-gray-500'
                    }`}>
                      {user.notificationSound === sound.url && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                    <span className="font-medium">{sound.name}</span>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePlaySound(sound.url);
                    }}
                    className="p-2 bg-gray-600 hover:bg-gray-500 rounded-full text-white transition-colors"
                    title="Preview Sound"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-blue-900/20 border border-blue-800/50 rounded-lg p-4">
            <p className="text-xs text-blue-300 flex items-start">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Schedulers will receive a popup notification and sound alert for every new breakdown report.
            </p>
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

export default NotificationSettingsModal;
