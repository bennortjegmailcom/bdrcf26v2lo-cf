import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import { Artisan, Responsibility, Shift } from '../../types';

interface EditArtisanModalProps {
  isOpen: boolean;
  onClose: () => void;
  artisan: Artisan | null;
  onSubmit: (artisanId: string, updates: Partial<Artisan>) => void;
}

const EditArtisanModal: React.FC<EditArtisanModalProps> = ({ isOpen, onClose, artisan, onSubmit }) => {
  const [name, setName] = useState('');
  const [responsibility, setResponsibility] = useState<Responsibility>(Responsibility.FITTER);
  const [shift, setShift] = useState<Shift>(Shift.A);

  useEffect(() => {
    if (artisan) {
      setName(artisan.name);
      setResponsibility(artisan.responsibility);
      setShift(artisan.shift);
    }
  }, [artisan]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!artisan || !name.trim()) {
      alert('Artisan data is missing or name is empty.');
      return;
    }

    const updates: Partial<Artisan> = {
      name: name.trim(),
      responsibility,
      shift,
    };
    
    onSubmit(artisan.id, updates);
    onClose();
  };
  
  if (!artisan) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Edit Artisan: ${artisan.name}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name-edit" className="block text-sm font-medium text-gray-300">Full Name</label>
          <input type="text" id="name-edit" value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full bg-gray-700 border border-gray-600 text-white rounded-md p-2" required />
        </div>
        <div>
          <label htmlFor="responsibility-edit" className="block text-sm font-medium text-gray-300">Responsibility</label>
          <select id="responsibility-edit" value={responsibility} onChange={(e) => setResponsibility(e.target.value as Responsibility)} className="mt-1 w-full bg-gray-700 border border-gray-600 text-white rounded-md p-2" required>
            {Object.values(Responsibility).map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="shift-edit" className="block text-sm font-medium text-gray-300">Shift</label>
          <select id="shift-edit" value={shift} onChange={(e) => setShift(e.target.value as Shift)} className="mt-1 w-full bg-gray-700 border border-gray-600 text-white rounded-md p-2" required>
            {Object.values(Shift).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex justify-end pt-4 space-x-2">
            <button type="button" onClick={onClose} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md">Cancel</button>
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md">Save Changes</button>
        </div>
      </form>
    </Modal>
  );
};

export default EditArtisanModal;