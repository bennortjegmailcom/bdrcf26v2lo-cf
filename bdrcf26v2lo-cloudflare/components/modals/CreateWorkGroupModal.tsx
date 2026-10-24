import React, { useState } from 'react';
import Modal from '../ui/Modal';
import { SECTION_COLORS } from '../../constants';

interface CreateWorkGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string, color?: string) => void;
}

const CreateWorkGroupModal: React.FC<CreateWorkGroupModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState(SECTION_COLORS[1]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Please enter a name for the work group.');
      return;
    }
    onSubmit(name.trim(), color);
    onClose();
    setName('');
    setColor(SECTION_COLORS[1]);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Work Group">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="wg-name" className="block text-sm font-medium text-gray-300">Work Group Name</label>
          <input 
            type="text" 
            id="wg-name" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            className="mt-1 w-full bg-gray-700 border border-gray-600 text-white rounded-md p-2" 
            required 
            autoFocus
          />
        </div>
        <div>
          <label htmlFor="wg-color" className="block text-sm font-medium text-gray-300">Section Colour</label>
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
              id="wg-color"
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
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md">Create</button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateWorkGroupModal;
