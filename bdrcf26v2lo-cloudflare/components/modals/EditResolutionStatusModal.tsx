import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import { ResolutionStatusItem } from '../../types';

interface EditResolutionStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  statusItem: ResolutionStatusItem | null;
  onSubmit: (id: string, updates: Partial<ResolutionStatusItem>) => void;
}

const COLORS = [
  { label: 'Purple', value: 'bg-purple-600' },
  { label: 'Gray', value: 'bg-gray-600' },
  { label: 'Red', value: 'bg-red-600' },
  { label: 'Orange', value: 'bg-orange-600' },
  { label: 'Amber', value: 'bg-amber-600' },
  { label: 'Yellow', value: 'bg-yellow-600' },
  { label: 'Green', value: 'bg-green-600' },
  { label: 'Blue', value: 'bg-blue-600' },
  { label: 'Indigo', value: 'bg-indigo-600' },
  { label: 'Pink', value: 'bg-pink-600' },
];

const EditResolutionStatusModal: React.FC<EditResolutionStatusModalProps> = ({ isOpen, onClose, statusItem, onSubmit }) => {
  const [name, setName] = useState('');
  const [statusUrgText, setStatusUrgText] = useState('');
  const [badgeColor, setBadgeColor] = useState('');

  useEffect(() => {
    if (statusItem) {
      setName(statusItem.name);
      setStatusUrgText(statusItem.statusUrgText || '');
      setBadgeColor(statusItem.badgeColor || '');
    }
  }, [statusItem]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusItem || !name.trim()) return;

    onSubmit(statusItem.id, {
      name: name.trim(),
      statusUrgText: statusUrgText.trim() || undefined,
      badgeColor: badgeColor || undefined,
    });
    onClose();
  };

  if (!statusItem) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Resolution Status">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-300">Description</label>
          <input 
            type="text" 
            id="name" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            className="mt-1 w-full bg-gray-700 border border-gray-600 text-white rounded-md p-2" 
            required 
          />
        </div>
        <div>
          <label htmlFor="statusUrgText" className="block text-sm font-medium text-gray-300">Status+Urg Text Override (Optional)</label>
          <p className="text-xs text-gray-500 mb-1">If set, this text will be shown in the Status column instead of the default badge.</p>
          <input 
            type="text" 
            id="statusUrgText" 
            value={statusUrgText} 
            onChange={(e) => setStatusUrgText(e.target.value)} 
            className="mt-1 w-full bg-gray-700 border border-gray-600 text-white rounded-md p-2" 
            placeholder="e.g. Handed Over"
          />
        </div>
        <div>
          <label htmlFor="badgeColor" className="block text-sm font-medium text-gray-300">Button Colour</label>
          <select 
            id="badgeColor" 
            value={badgeColor} 
            onChange={(e) => setBadgeColor(e.target.value)} 
            className="mt-1 w-full bg-gray-700 border border-gray-600 text-white rounded-md p-2"
          >
            <option value="">Default (No override)</option>
            {COLORS.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        {statusUrgText && badgeColor && (
          <div className="mt-4 p-4 bg-gray-800 rounded-lg border border-gray-700 flex flex-col items-center justify-center">
            <span className="text-sm text-gray-400 mb-2">Preview in table:</span>
            <span className={`px-2 py-1 text-xs font-semibold rounded-full text-white ${badgeColor}`}>
              {statusUrgText}
            </span>
          </div>
        )}

        <div className="flex justify-end pt-4 space-x-2">
            <button type="button" onClick={onClose} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md">Cancel</button>
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md">Save Changes</button>
        </div>
      </form>
    </Modal>
  );
};

export default EditResolutionStatusModal;
