import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import { HandoverSection, Role } from '../../types';
import { SECTION_COLORS, getSectionColor } from '../../constants';

interface ManageSectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string, targetRole?: Role, color?: string) => void;
  section?: HandoverSection | null;
}

const ManageSectionModal: React.FC<ManageSectionModalProps> = ({ isOpen, onClose, onSubmit, section }) => {
  const [name, setName] = useState('');
  const [targetRole, setTargetRole] = useState<string>('');
  const [color, setColor] = useState(SECTION_COLORS[0]);

  useEffect(() => {
    if (isOpen) {
      if (section) {
        setName(section.name);
        setTargetRole(section.targetRole || '');
        setColor(getSectionColor(section.name, section.color));
      } else {
        setName('');
        setTargetRole('');
        setColor(SECTION_COLORS[0]);
      }
    }
  }, [isOpen, section]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Please enter a name for the handover section.');
      return;
    }
    onSubmit(name.trim(), targetRole ? (targetRole as Role) : undefined, color);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={section ? 'Edit Handover Section' : 'Create Handover Section'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="section-name" className="block text-sm font-medium text-gray-300">Section Name</label>
          <input 
            type="text" 
            id="section-name" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            className="mt-1 w-full bg-gray-700 border border-gray-600 text-white rounded-md p-2" 
            placeholder="e.g. Electrical, Mechanical"
            required 
            autoFocus
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300">Section Colour</label>
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
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-7 w-9 bg-transparent border border-gray-600 rounded cursor-pointer"
              title="Custom colour"
            />
          </div>
          <p className="mt-1.5 text-xs text-gray-400">
            Bookings for this section are drawn in this colour on the Meeting Overview timeline.
          </p>
        </div>

        <div>
          <label htmlFor="section-role" className="block text-sm font-medium text-gray-300">Authorized Acknowledging Role (Optional)</label>
          <select
            id="section-role"
            value={targetRole}
            onChange={(e) => setTargetRole(e.target.value)}
            className="mt-1 w-full bg-gray-700 border border-gray-600 text-white rounded-md p-2"
          >
            <option value="">-- No specific role (Any supervisor/admin) --</option>
            {Object.values(Role).map((role) => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
          <p className="mt-1.5 text-xs text-gray-400">
            Specifies who should acknowledge handovers sent to this section. When resolving a job to this section, candidate recipients will be filtered by this role.
          </p>
        </div>

        <div className="flex justify-end pt-4 space-x-2">
            <button type="button" onClick={onClose} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md">Cancel</button>
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md">
              {section ? 'Save Changes' : 'Create'}
            </button>
        </div>
      </form>
    </Modal>
  );
};

export default ManageSectionModal;
