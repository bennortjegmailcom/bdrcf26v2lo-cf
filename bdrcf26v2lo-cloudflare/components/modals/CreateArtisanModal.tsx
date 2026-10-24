import React, { useState } from 'react';
import Modal from '../ui/Modal';
import { Responsibility, Shift, Artisan } from '../../types';

interface CreateArtisanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<Artisan, 'id'>) => void;
}

const CreateArtisanModal: React.FC<CreateArtisanModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [name, setName] = useState('');
  const [employeeNumber, setEmployeeNumber] = useState('');
  const [responsibility, setResponsibility] = useState<Responsibility>(Responsibility.FITTER);
  const [shift, setShift] = useState<Shift>(Shift.A);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Please enter a name for the artisan.');
      return;
    }
    onSubmit({ name: name.trim(), employeeNumber: employeeNumber.trim() || undefined, responsibility, shift });
    onClose();
    setName('');
    setEmployeeNumber('');
    setResponsibility(Responsibility.FITTER);
    setShift(Shift.A);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Artisan">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="artisan-name" className="block text-sm font-medium text-gray-300">Artisan Name</label>
          <input 
            type="text" 
            id="artisan-name" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            className="mt-1 w-full bg-gray-700 border border-gray-600 text-white rounded-md p-2" 
            required 
            autoFocus
          />
        </div>
        <div>
          <label htmlFor="artisan-emp" className="block text-sm font-medium text-gray-300">Employee Number (Optional)</label>
          <input 
            type="text" 
            id="artisan-emp" 
            value={employeeNumber} 
            onChange={(e) => setEmployeeNumber(e.target.value)} 
            className="mt-1 w-full bg-gray-700 border border-gray-600 text-white rounded-md p-2" 
          />
        </div>
        <div>
          <label htmlFor="responsibility-create" className="block text-sm font-medium text-gray-300">Responsibility</label>
          <select id="responsibility-create" value={responsibility} onChange={(e) => setResponsibility(e.target.value as Responsibility)} className="mt-1 w-full bg-gray-700 border border-gray-600 text-white rounded-md p-2" required>
            {Object.values(Responsibility).map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
         <div>
          <label htmlFor="shift-create" className="block text-sm font-medium text-gray-300">Shift</label>
          <select id="shift-create" value={shift} onChange={(e) => setShift(e.target.value as Shift)} className="mt-1 w-full bg-gray-700 border border-gray-600 text-white rounded-md p-2" required>
            {Object.values(Shift).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex justify-end pt-4 space-x-2">
            <button type="button" onClick={onClose} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md">Cancel</button>
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md">Create</button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateArtisanModal;