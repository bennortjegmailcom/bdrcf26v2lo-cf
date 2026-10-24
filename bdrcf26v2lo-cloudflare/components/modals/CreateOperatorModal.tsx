import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import { Shift, WorkGroup, User, Role } from '../../types';

interface CreateOperatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string, shift: Shift, workGroup?: string, employeeNumber?: string) => void;
  workGroups?: WorkGroup[];
  currentUser?: User;
}

const CreateOperatorModal: React.FC<CreateOperatorModalProps> = ({ isOpen, onClose, onSubmit, workGroups = [], currentUser }) => {
  const [name, setName] = useState('');
  const [shift, setShift] = useState<Shift>(Shift.A);
  const [workGroup, setWorkGroup] = useState('');
  const [employeeNumber, setEmployeeNumber] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (currentUser) {
        setShift(currentUser.shift || Shift.A);
        setWorkGroup(currentUser.workGroup || '');
      } else {
        setShift(Shift.A);
        setWorkGroup('');
      }
      setEmployeeNumber('');
    }
  }, [isOpen, currentUser]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit(name.trim(), shift, workGroup || '', employeeNumber.trim() || '');
    setName('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Team Member">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300">Team Member Name</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full bg-gray-700 border border-gray-600 text-white rounded-md p-2" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300">Employee Number</label>
          <input type="text" value={employeeNumber} onChange={(e) => setEmployeeNumber(e.target.value)} className="mt-1 w-full bg-gray-700 border border-gray-600 text-white rounded-md p-2" placeholder="Optional" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300">Area / Work Group</label>
          <select value={workGroup} onChange={(e) => setWorkGroup(e.target.value)} className="mt-1 w-full bg-gray-700 border border-gray-600 text-white rounded-md p-2">
            <option value="">-- No Area --</option>
            {workGroups.map((wg, i) => <option key={`${wg.id}-${i}`} value={wg.name}>{wg.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300">Assigned Shift</label>
          <select value={shift} onChange={(e) => setShift(e.target.value as Shift)} className="mt-1 w-full bg-gray-700 border border-gray-600 text-white rounded-md p-2" required>
            {Object.values(Shift).map(s => <option key={s} value={s}>Shift {s}</option>)}
          </select>
        </div>
        <div className="flex justify-end pt-4 space-x-2">
            <button type="button" onClick={onClose} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md">Cancel</button>
            <button type="submit" className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md">Add Team Member</button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateOperatorModal;
