import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import { WorkGroup } from '../../types';
import { SECTION_COLORS } from '../../constants';

interface EditWorkGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  workGroup: WorkGroup | null;
  onSubmit: (workGroupId: string, updates: Partial<WorkGroup>) => void;
}

const EditWorkGroupModal: React.FC<EditWorkGroupModalProps> = ({ isOpen, onClose, workGroup, onSubmit }) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState(SECTION_COLORS[0]);

  useEffect(() => {
    if (workGroup) {
      setName(workGroup.name);
      setColor(workGroup.color || SECTION_COLORS[0]);
    }
  }, [workGroup]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workGroup || !name.trim()) {
      alert('Work group data is missing or name is empty.');
      return;
    }

    onSubmit(workGroup.id, { name: name.trim(), color });
    onClose();
  };
  
  if (!workGroup) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Edit Work Group: ${workGroup.name}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="wg-name-edit" className="block text-sm font-medium text-gray-300">Work Group Name</label>
          <input 
            type="text" 
            id="wg-name-edit" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            className="mt-1 w-full bg-gray-700 border border-gray-600 text-white rounded-md p-2" 
            required
            autoFocus
          />
        </div>
        <div>
          <label htmlFor="wg-color-edit" className="block text-sm font-medium text-gray-300">Section Colour</label>
          <div className="mt-1 flex items-center gap-2 flex-wrap">
            {SECTION_COLORS.map(swatch => (
              <button
                key={swatch}
                type="button"
                onClick={() => setColor(swatch)}
                className={`h-7 w-7 rounded-full border-2 transition ${color === swatch ? 'border-white scale-110' : 'border-transparent hover:border-gray-400'}`}
                style={{ backgroundColor: swatch }}
                title={swatch}
              />
            ))}
            <input
              type="color"
              id="wg-color-edit"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-7 w-9 bg-transparent border border-gray-600 rounded cursor-pointer"
              title="Custom colour"
            />
          </div>
          <p className="mt-1.5 text-xs text-gray-400">Used to colour this section in the Meeting Overview.</p>
        </div>
        <div className="flex justify-end pt-4 space-x-2">
            <button type="button" onClick={onClose} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md">Cancel</button>
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md">Save Changes</button>
        </div>
      </form>
    </Modal>
  );
};

export default EditWorkGroupModal;
